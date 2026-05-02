// src/useDeckStudy.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './lib/supabase';
import wordsData from './words.json'; // 🌟 公式データをインポート

export type WordRow = {
  id: string;
  word: string;
  meaning: string;
  example_en: string;
  example_ja: string;
  choices: string[];
};

export type ProgressRow = {
  word_id: string;
  stage: number;
  next_show_at: number;
  correct_count: number;
  wrong_count: number;
};

export const useDeckStudy = (userId: string, deckId: string) => {
  const [words, setWords] = useState<WordRow[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressRow>>({});
  const [loading, setLoading] = useState(true);
  const [globalCount, setGlobalCount] = useState(0);
  const [sessionUsedIds, setSessionUsedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // 1. 単語リストの準備
      if (deckId === 'default') {
        // 🌟 公式セットの場合: JSONデータを WordRow 形式に変換
        const mapped = (wordsData as any[]).map(w => ({
          id: String(w.id), // IDを文字列にする
          word: w.word,
          meaning: w.quiz.answer,
          example_en: w.example.en,
          example_ja: w.example.ja,
          choices: w.quiz.distractors
        }));
        setWords(mapped);
      } else {
        // 自作セットの場合: Supabaseから取得
        const { data: wData } = await supabase.from('words').select('*').eq('deck_id', deckId);
        if (wData) setWords(wData);
      }

      // 2. 学習進捗の取得（公式・自作共通）
      const { data: pData } = await supabase.from('progress').select('*').eq('user_id', userId);
      if (pData) {
        const pMap: Record<string, ProgressRow> = {};
        pData.forEach(p => { pMap[p.word_id] = p; });
        setProgressMap(pMap);
        const totalAnswers = pData.reduce((sum, p) => sum + p.correct_count + p.wrong_count, 0);
        setGlobalCount(totalAnswers);
      }
      setLoading(false);
    };
    fetchData();
  }, [userId, deckId]);

  // --- (以下の resetSession, generateNextQuestion, handleAnswer, stats は以前と同じ) ---
  const resetSession = useCallback(() => setSessionUsedIds(new Set()), []);

  const getNextWord = useCallback((): WordRow | null => {
    if (words.length === 0) return null;
    const available = words.filter(w => !sessionUsedIds.has(w.id));
    if (available.length > 0) return available[Math.floor(Math.random() * available.length)];
    return null;
  }, [words, sessionUsedIds]);

  const generateNextQuestion = useCallback((numChoices: number) => {
    const word = getNextWord();
    if (!word) return null;
    setSessionUsedIds(prev => new Set(prev).add(word.id));
    const answer = word.meaning;
    let distractors = word.choices || [];
    if (distractors.length < numChoices - 1) {
      const others = words.filter(w => w.id !== word.id).map(w => w.meaning).filter(Boolean);
      others.sort(() => Math.random() - 0.5);
      distractors = [...new Set([...distractors, ...others])].slice(0, numChoices - 1);
    }
    const choices = [answer, ...distractors].sort(() => Math.random() - 0.5);
    return { word, choices };
  }, [getNextWord, words]);

  const handleAnswer = useCallback(async (wordId: string, result: 'correct' | 'wrong' | 'skip') => {
    const current = progressMap[wordId] || { stage: 0, correct_count: 0, wrong_count: 0, next_show_at: 0 };
    let newStage = current.stage;
    if (result === 'correct') newStage = Math.min(2, current.stage + 1);
    else if (result === 'wrong') newStage = -1;

    const newProgress = {
      user_id: userId,
      word_id: wordId,
      stage: newStage,
      correct_count: current.correct_count + (result === 'correct' ? 1 : 0),
      wrong_count: current.wrong_count + (result === 'wrong' ? 1 : 0),
      next_show_at: globalCount + 10
    };
    setProgressMap(prev => ({ ...prev, [wordId]: newProgress as ProgressRow }));
    setGlobalCount(prev => prev + 1);
    await supabase.from('progress').upsert([newProgress]);
  }, [userId, progressMap, globalCount]);

  const stats = useMemo(() => {
    const totalWords = words.length;
    const learnedCount = Object.values(progressMap).filter(p => p.stage === 2).length;
    const learningCount = Object.values(progressMap).filter(p => p.stage > -2 && p.stage < 2).length;
    const unlearnedCount = totalWords - (learnedCount + learningCount);
    return { totalWords, learnedCount, learningCount, unlearnedCount, globalCount, weakWords: [] };
  }, [words, progressMap, globalCount]);

  return { words, stats, loading, generateNextQuestion, handleAnswer, resetSession };
};