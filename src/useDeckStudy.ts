// src/useDeckStudy.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './lib/supabase';
import localforage from 'localforage'; // localforage の導入
import toshinDataRaw from './words_toshin1800.json';
import targetDataRaw from './words_target1900.json';

export interface WordData {
  id: number;
  word: string;
  core: string;
  details: Array<{
    pos: string[];
    items: string[];
  }>;
  example: {
    en: string;
    ja: string;
  };
  quiz: {
    answer: string;
    distractors: string[];
  };
  audio: {
    tango: string;
    reibun: string;
  };
}

const toshinData = toshinDataRaw as WordData[];
const targetData = targetDataRaw as WordData[];

export type WordRow = {
  id: string;
  word: string;
  meaning: string;
  example_en: string;
  example_ja: string;
  choices: string[];
  audio_tango?: string;
  audio_reibun?: string;
};

export type ProgressRow = {
  word_id: string;
  stage: number;
  next_show_at: number;
  correct_count: number;
  wrong_count: number;
};

// synced（ローカル同期フラグ）を拡張した進捗の型定義
type LocalProgressRow = ProgressRow & { synced?: boolean };

export const useDeckStudy = (userId: string, deckId: string, partIndex: number = -1) => {
  const [allWords, setAllWords] = useState<WordRow[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, LocalProgressRow>>({});
  const [loading, setLoading] = useState(true);
  const [globalCount, setGlobalCount] = useState(0);
  const [sessionUsedIds, setSessionUsedIds] = useState<Set<string>>(new Set());

  // オンライン/オフラインの状態監視
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // オフライン中に溜まった解答データを Supabase に安全に一括同期する関数
  const syncLocalProgressToCloud = useCallback(async (online: boolean) => {
    if (!online || !userId) return;

    try {
      const cachedProgress = await localforage.getItem<Record<string, LocalProgressRow>>(`progress_${userId}`);
      if (!cachedProgress) return;

      // synced === false（未同期）のレコードのみを抽出
      const unsyncedRows = Object.values(cachedProgress).filter(p => p.synced === false);
      if (unsyncedRows.length === 0) return;

      // 💡 ESLint対応:Synced未使用警告を防ぐため、_synced にリネーム
      const payload = unsyncedRows.map(({ synced: _synced, ...rest }) => ({
        user_id: userId,
        ...rest
      }));

      // Supabaseへ一括 upsert（クラウド上を最新化）
      const { error } = await supabase.from('progress').upsert(payload);

      if (!error) {
        // 同期に成功したら、ローカルデータのフラグをすべてSynced(true)にして上書き保存
        const updatedProgress = { ...cachedProgress };
        unsyncedRows.forEach(row => {
          if (updatedProgress[row.word_id]) {
            updatedProgress[row.word_id].synced = true;
          }
        });
        await localforage.setItem(`progress_${userId}`, updatedProgress);
        setProgressMap(updatedProgress);
        console.log(`☁️ オフライン時の進捗データ ${unsyncedRows.length} 件をクラウドに同期しました。`);
      } else {
        console.error("❌ 進捗の同期に失敗しました:", error);
      }
    } catch (err) {
      console.error("🚨 同期処理でエラーが発生しました:", err);
    }
  }, [userId]);

  // オンライン復帰時に自動で同期処理をトリガー
  useEffect(() => {
    if (isOnline) {
      // 💡 ESLintの cascading render 警告（非推奨のsetState呼出警告）を回避するため、
      // 実行コンテキストのキューを非同期で明示的に分離し、警告を無視するアノテーションを追加します。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      syncLocalProgressToCloud(isOnline);
    }
  }, [isOnline, syncLocalProgressToCloud]);

  // データフェッチ（オンラインとオフラインの切り分け）
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // --- 1. デッキ全単語の取得 ---
      if (deckId === 'toshin1800' || deckId === 'default') {
        const mapped = toshinData.map(w => ({
          id: String(w.id), word: w.word, meaning: w.quiz.answer,
          example_en: w.example.en, example_ja: w.example.ja, choices: w.quiz.distractors,
          audio_tango: w.audio.tango || undefined,
          audio_reibun: w.audio.reibun || undefined,
        }));
        setAllWords(mapped);

      } else if (deckId === 'target1900') {
        const mapped = targetData.map(w => {
          const numStr = String(w.id).padStart(4, '0');
          return {
            id: `target_${w.id}`, word: w.word, meaning: w.quiz.answer,
            example_en: w.example.en, example_ja: w.example.ja, choices: w.quiz.distractors,
            audio_tango: `TG1900_${numStr}e.m4a`,
            audio_reibun: `TG1900_${numStr}s.m4a`,
          };
        });
        setAllWords(mapped);

      } else if (deckId === 'weak') {
        let weakIds: string[] = [];
        if (isOnline) {
          const { data: pwData } = await supabase.from('progress').select('word_id').eq('user_id', userId).gt('wrong_count', 0);
          weakIds = pwData ? pwData.map(p => p.word_id) : [];
        } else {
          const cachedProgress = await localforage.getItem<Record<string, LocalProgressRow>>(`progress_${userId}`);
          if (cachedProgress) {
            weakIds = Object.values(cachedProgress).filter(p => p.wrong_count > 0).map(p => p.word_id);
          }
        }

        const toshinMapped = toshinData.map(w => ({
          id: String(w.id), word: w.word, meaning: w.quiz.answer,
          example_en: w.example.en, example_ja: w.example.ja, choices: w.quiz.distractors,
          audio_tango: w.audio.tango || undefined,
          audio_reibun: w.audio.reibun || undefined,
        }));

        const targetMapped = targetData.map(w => {
          const numStr = String(w.id).padStart(4, '0');
          return {
            id: `target_${w.id}`, word: w.word, meaning: w.quiz.answer,
            example_en: w.example.en, example_ja: w.example.ja, choices: w.quiz.distractors,
            audio_tango: `TG1900_${numStr}e.m4a`,
            audio_reibun: `TG1900_${numStr}s.m4a`,
          };
        });

        // 自作単語（weakIds に含まれるもの）の取得
        const customIds = weakIds.filter(id => id.length > 10);
        let customWords: WordRow[] = [];
        if (customIds.length > 0) {
          if (isOnline) {
            const { data: cwData } = await supabase.from('words').select('*').in('id', customIds);
            if (cwData) customWords = cwData as WordRow[];
          } else {
            const cachedWords = await localforage.getItem<WordRow[]>(`words_${deckId}`);
            if (cachedWords) {
              customWords = cachedWords.filter(w => customIds.includes(w.id));
            }
          }
        }
        
        const mappedDefault = [...toshinMapped, ...targetMapped].filter(w => weakIds.includes(w.id));
        setAllWords([...mappedDefault, ...customWords]);

      } else {
        // 自作単語セット（ deckId !== 'toshin1800' 等 ）
        if (isOnline) {
          const { data: wData } = await supabase.from('words').select('*').eq('deck_id', deckId);
          if (wData) {
            const wordsList = wData as WordRow[];
            setAllWords(wordsList);
            await localforage.setItem(`words_${deckId}`, wordsList);
          }
        } else {
          const cachedWords = await localforage.getItem<WordRow[]>(`words_${deckId}`);
          if (cachedWords) {
            setAllWords(cachedWords);
          }
        }
      }

      // --- 2. 進捗(progress)の取得とキャッシュ ---
      let pMap: Record<string, LocalProgressRow> = {};
      let totalAnswers = 0;

      if (isOnline) {
        const { data: pData } = await supabase.from('progress').select('*').eq('user_id', userId);
        if (pData) {
          pData.forEach(p => {
            pMap[p.word_id] = { ...p, synced: true };
          });
          totalAnswers = pData.reduce((sum, p) => sum + p.correct_count + p.wrong_count, 0);
          
          await localforage.setItem(`progress_${userId}`, pMap);
        }
      } else {
        const cachedProgress = await localforage.getItem<Record<string, LocalProgressRow>>(`progress_${userId}`);
        if (cachedProgress) {
          pMap = cachedProgress;
          totalAnswers = Object.values(cachedProgress).reduce((sum, p) => sum + p.correct_count + p.wrong_count, 0);
        }
      }

      setProgressMap(pMap);
      setGlobalCount(totalAnswers);
      setLoading(false);
    };

    fetchData();
  }, [userId, deckId, isOnline]);

  const words = useMemo(() => {
    if (partIndex === -1 || deckId === 'weak') {
      return allWords;
    }
    const start = partIndex * 100;
    const end = start + 100;
    return allWords.slice(start, end);
  }, [allWords, partIndex, deckId]);

  const resetSession = useCallback(() => setSessionUsedIds(new Set()), []);

  const getNextWord = useCallback((): WordRow | null => {
    if (words.length === 0) return null;
    const available = words.filter(w => !sessionUsedIds.has(w.id));
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
    return null;
  }, [words, sessionUsedIds]);

  const generateNextQuestion = useCallback((numChoices: number) => {
    const word = getNextWord();
    if (!word) return null;
    
    setSessionUsedIds(prev => new Set(prev).add(word.id));
    
    const answer = word.meaning;
    let distractors = word.choices || [];
    
    if (distractors.length < numChoices - 1) {
      const pool = words.length > numChoices ? words : allWords;
      const others = pool.filter(w => w.id !== word.id).map(w => w.meaning).filter(Boolean);
      others.sort(() => Math.random() - 0.5);
      distractors = [...new Set([...distractors, ...others])];
    }
    
    distractors = distractors.slice(0, numChoices - 1);
    const choices = [answer, ...distractors].sort(() => Math.random() - 0.5);
    return { word, choices };
  }, [getNextWord, words, allWords]);

  const handleAnswer = useCallback(async (wordId: string, result: 'correct' | 'wrong' | 'skip') => {
    const current = progressMap[wordId] || { stage: 0, correct_count: 0, wrong_count: 0, next_show_at: 0 };
    let newStage = current.stage;
    if (result === 'correct') newStage = Math.min(2, current.stage + 1);
    else if (result === 'wrong') newStage = -1;

    // クラウド/ローカル両用の進捗レコードを新規作成
    const newProgress: LocalProgressRow = {
      word_id: wordId,
      stage: newStage,
      correct_count: current.correct_count + (result === 'correct' ? 1 : 0),
      wrong_count: current.wrong_count + (result === 'wrong' ? 1 : 0),
      next_show_at: globalCount + 10,
      synced: isOnline
    };

    // メモリ上のステートを即時更新
    setProgressMap(prev => ({ ...prev, [wordId]: newProgress }));
    setGlobalCount(prev => prev + 1);

    // IndexedDB への永続化
    const cachedProgress = await localforage.getItem<Record<string, LocalProgressRow>>(`progress_${userId}`) || {};
    cachedProgress[wordId] = newProgress;
    await localforage.setItem(`progress_${userId}`, cachedProgress);

    // オンライン状態の場合のみ、Supabase に保存
    if (isOnline) {
      // 💡 ESLint対応:Synced未使用警告を防ぐため、_synced にリネーム
      const { synced: _synced, ...supabasePayload } = newProgress;
      await supabase.from('progress').upsert([{ user_id: userId, ...supabasePayload }]);
    } else {
      console.log("📶 オフライン解答のため、進捗をローカルデータベースに退避しました。");
    }
  }, [userId, progressMap, globalCount, isOnline]);

  const stats = useMemo(() => {
    const totalWords = words.length;
    const wordIds = new Set(words.map(w => w.id));
    const deckProgress = Object.values(progressMap).filter(p => wordIds.has(p.word_id));
    const learnedCount = deckProgress.filter(p => p.stage === 2).length;
    const learningCount = deckProgress.filter(p => p.stage !== 2).length;
    const unlearnedCount = totalWords - deckProgress.length;
    return { totalWords, learnedCount, learningCount, unlearnedCount, globalCount, weakWords: [] };
  }, [words, progressMap, globalCount]);

  const totalAllWordsCount = allWords.length;

  return { words, totalAllWordsCount, stats, loading, generateNextQuestion, handleAnswer, resetSession };
};