// src/useQuizLogic.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { WordData, UserData } from './types';

const STORAGE_KEY = 'vocab_app_data';

export const useQuizLogic = (allWords: WordData[]) => {
  const [userData, setUserData] = useState<UserData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { globalCount: 0, progress: {} };
  });

  const [sessionUsedIds, setSessionUsedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  }, [userData]);

  const resetSession = useCallback(() => {
    setSessionUsedIds(new Set());
  }, []);

  // 内部関数：純粋に「次の単語」を選ぶだけ
  const getNextWord = useCallback((): WordData | null => {
    const { globalCount, progress } = userData;

    if (globalCount > 0 && globalCount % 5 === 0) {
      const unlearned = allWords.filter(w => !progress[w.id] && !sessionUsedIds.has(w.id));
      if (unlearned.length > 0) return unlearned[Math.floor(Math.random() * unlearned.length)];
    }

    const reviewCandidates = allWords.filter(w => {
      const p = progress[w.id];
      if (!p || sessionUsedIds.has(w.id)) return false;
      return p.nextShowAt <= globalCount;
    });

    if (reviewCandidates.length > 0) {
      reviewCandidates.sort((a, b) => (globalCount - progress[b.id].nextShowAt) - (globalCount - progress[a.id].nextShowAt));
      const top3 = reviewCandidates.slice(0, 3);
      return top3[Math.floor(Math.random() * top3.length)];
    }

    const unlearned = allWords.filter(w => !progress[w.id] && !sessionUsedIds.has(w.id));
    if (unlearned.length > 0) return unlearned[Math.floor(Math.random() * unlearned.length)];

    const fallbacks = allWords.filter(w => !sessionUsedIds.has(w.id));
    if (fallbacks.length > 0) return fallbacks[Math.floor(Math.random() * fallbacks.length)];

    return null;
  }, [allWords, userData, sessionUsedIds]);

  // 🌟 外部に公開する「問題生成API」（UIに依存しない設計）
  const generateNextQuestion = useCallback((numChoices: number) => {
    const word = getNextWord();
    if (!word) return null;

    // 🔥 Claude指摘対応：問題が決まった時点で出題済みにする（連続出題防止）
    setSessionUsedIds(prev => new Set(prev).add(word.id));

    // 🔥 ChatGPT指摘対応：選択肢の生成はロジック側の責務とする
    const distractors = [...word.quiz.distractors].sort(() => Math.random() - 0.5).slice(0, numChoices - 1);
    const choices = [word.quiz.answer, ...distractors].sort(() => Math.random() - 0.5);

    return { word, choices };
  }, [getNextWord]);

  // 回答処理
  const handleAnswer = useCallback((wordId: number, result: 'correct' | 'wrong' | 'skip', responseTime: number) => {
    setUserData(prev => {
      const currentProgress = prev.progress[wordId] || { stage: 0, correctCount: 0, wrongCount: 0 };
      let newStage = currentProgress.stage;
      let addedInterval = 0;

      if (result === 'correct') {
        newStage = currentProgress.stage >= 1 ? 2 : 1;
        let baseInterval = newStage === 2 ? 200 : 50;
        if (responseTime > 3.0) baseInterval = Math.max(15, Math.floor(baseInterval / 2));
        addedInterval = baseInterval;
      } else if (result === 'wrong') {
        newStage = -1;
        addedInterval = 20;
      } else if (result === 'skip') {
        newStage = -2;
        addedInterval = 10;
      }

      return {
        globalCount: prev.globalCount + 1,
        progress: {
          ...prev.progress,
          [wordId]: {
            stage: newStage,
            nextShowAt: prev.globalCount + 1 + addedInterval,
            correctCount: currentProgress.correctCount + (result === 'correct' ? 1 : 0),
            // 🔥 Claude指摘対応：skipは「間違えたわけではない」としてwrongCountから除外
            wrongCount: currentProgress.wrongCount + (result === 'wrong' ? 1 : 0),
            lastResponseTime: responseTime
          }
        }
      };
    });
  }, []);

  // 🌟 ChatGPT＆Claude指摘対応：分析データをHook内で計算し、App.tsxを綺麗にする
  const stats = useMemo(() => {
    const totalWords = allWords.length;
    const learnedCount = Object.values(userData.progress).filter(p => p.stage === 2).length;
    const learningCount = Object.values(userData.progress).filter(p => p.stage >= -2 && p.stage < 2).length;
    const unlearnedCount = totalWords - (learnedCount + learningCount);
    const weakWords = [...allWords]
      .filter(w => (userData.progress[w.id]?.wrongCount || 0) > 0)
      .sort((a, b) => userData.progress[b.id].wrongCount - userData.progress[a.id].wrongCount)
      .slice(0, 5);

    return { totalWords, learnedCount, learningCount, unlearnedCount, weakWords };
  }, [allWords, userData.progress]);

  return { userData, stats, generateNextQuestion, handleAnswer, resetSession };
};