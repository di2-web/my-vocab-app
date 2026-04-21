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
  lastResponseTime?: number;
}

export interface UserData {
  globalCount: number;
  progress: Record<number, WordProgress>;
}