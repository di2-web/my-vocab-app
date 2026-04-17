// src/types.ts

export interface WordData {
  id: number;
  word: string;
  core: string;
  example: {
    en: string;
    ja: string;
  };
  quiz: {
    answer: string;
    distractors: string[];
  };
  // 👇追加：JSONにある音声の番号データ（"0001"など）
  audio: {
    tango: string;
    reibun: string;
  };
}

export interface WordProgress {
  stage: number;
  nextShowAt: number;
  correctCount: number;
  wrongCount: number;
  // 👇追加：分析用に「直近の回答にかかった秒数」を記録する
  lastResponseTime?: number;
}

export interface UserData {
  globalCount: number;
  progress: Record<number, WordProgress>;
}