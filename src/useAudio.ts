// src/useAudio.ts
import { useCallback, useRef } from 'react';

export const useAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * 音声を再生する。
   * @param text     - テキスト読み上げ用（例文の英文、単語など）
   * @param filePath - 音声ファイルのパス（指定があれば優先して再生）
   */
  const playAudio = useCallback((text: string, filePath?: string) => {
    // ---- 音声ファイルがある場合はそちらを優先 ----
    if (filePath) {
      // 前の音声を止める
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const audio = new Audio(`/audio/${filePath}`);
      audioRef.current = audio;
      audio.play().catch(err => console.error('音声ファイル再生エラー:', err));
      return;
    }

    // ---- ファイルがない場合はWeb Speech APIにフォールバック ----
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google'))
                      || voices.find(v => v.lang.includes('en-US') && v.name.includes('Samantha'))
                      || voices.find(v => v.lang.includes('en-US'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    window.speechSynthesis.speak(utterance);
  }, []);

  return { playAudio };
}