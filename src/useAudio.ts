// src/useAudio.ts
import { useCallback } from 'react';

export const useAudio = () => {
  const playAudio = useCallback((text: string) => {
    if (!text || !window.speechSynthesis) return;

    // 前の音声が鳴っていたらキャンセル（連打対策）
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // 英語（アメリカ）に設定
    utterance.lang = 'en-US';
    // 学習用に少しだけゆっくり、一定のペースで発音
    utterance.rate = 0.85; 
    utterance.pitch = 1.0;

    // 可能なら、より高音質なGoogle等のネイティブ音声エンジンを選択する
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) 
                      || voices.find(v => v.lang.includes('en-US') && v.name.includes('Samantha')) // Mac/iOS用
                      || voices.find(v => v.lang.includes('en-US'));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    // 再生！
    window.speechSynthesis.speak(utterance);
  }, []);

  return { playAudio };
}