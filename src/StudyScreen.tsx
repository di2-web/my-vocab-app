// src/StudyScreen.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeckStudy, type WordRow } from './useDeckStudy';
import { useAudio } from './useAudio'; // 🌟 1. 作成した音声フックをインポート
import type { Deck } from './useDecks';

type Props = {
  user: any;
  deck: Deck;
  onBack: () => void;
};

type QuestionData = { word: WordRow; choices: string[] };

export default function StudyScreen({ user, deck, onBack }: Props) {
  const { words, stats, loading, generateNextQuestion, handleAnswer, resetSession } = useDeckStudy(user.id, deck.id);

  // 🌟 2. 音声再生関数を呼び出す
  const { playAudio } = useAudio();

  const [screen, setScreen] = useState<'HOME' | 'QUIZ'>('HOME');
  const [sessionCount, setSessionCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [answeredResult, setAnsweredResult] = useState<'correct' | 'wrong' | 'skip' | null>(null);

  const timerRef = useRef<number | null>(null);

  const loadQuestion = useCallback(() => {
    const nextQ = generateNextQuestion(4);
    if (!nextQ) {
      alert("このセットの単語はすべて学習しました！");
      setScreen('HOME');
      return;
    }
    setCurrentQuestion(nextQ);
    setAnsweredResult(null);

    // 🌟 3. 問題が出た瞬間に、英単語を自動で読み上げる！
    playAudio(nextQ.word.word);

  }, [generateNextQuestion, playAudio]); // playAudio を依存配列に追加

  const startSession = () => {
    resetSession();
    setSessionCount(1);
    loadQuestion();
    setScreen('QUIZ');
  };

  const goNext = useCallback(() => {
    setSessionCount(prev => prev + 1);
    loadQuestion();
  }, [loadQuestion]);

  const onAnswerClick = useCallback((choice: string | null) => {
    if (!currentQuestion || answeredResult) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const { word } = currentQuestion;
    let result: 'correct' | 'wrong' | 'skip' = 'skip';

    if (choice === word.meaning) result = 'correct';
    else if (choice !== null) result = 'wrong';

    setAnsweredResult(result);
    handleAnswer(word.id, result);

    if (result === 'correct') {
      timerRef.current = window.setTimeout(goNext, 800);
    }
  }, [currentQuestion, answeredResult, handleAnswer, goNext]);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>データ読み込み中...</div>;
  if (words.length === 0) return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>単語がありません</h2>
      <p>「編集」から単語を追加してください。</p>
      <button onClick={onBack}>一覧に戻る</button>
    </div>
  );

  return (
    <div>
      {screen === 'HOME' && (
        <div style={{ marginTop: '20px' }}>
          <button onClick={onBack} style={{ marginBottom: '20px' }}>← セット一覧に戻る</button>
          <h1 style={{ textAlign: 'center' }}>{deck.name}</h1>
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '10px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>📈 学習状況</h3>
            <p>総解答数: <strong>{stats.globalCount} 問</strong></p>
            <div style={{ display: 'flex', height: '20px', backgroundColor: '#e0e0e0', borderRadius: '10px', overflow: 'hidden', margin: '15px 0' }}>
              <div style={{ width: `${(stats.learnedCount / Math.max(stats.totalWords, 1)) * 100}%`, backgroundColor: '#4caf50' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#4caf50' }}>習得済: {stats.learnedCount}</span>
              <span style={{ color: '#9e9e9e' }}>未学習: {stats.unlearnedCount}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button onClick={startSession} style={{ padding: '15px 40px', fontSize: '18px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer' }}>
              学習をスタート ▶
            </button>
          </div>
        </div>
      )}

      {screen === 'QUIZ' && currentQuestion && (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '60vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>{sessionCount} 問目</span>
            <button onClick={() => setScreen('HOME')}>✖ 中断</button>
          </div>

          <h2 style={{ fontSize: '36px', textAlign: 'center', margin: '10px 0' }}>
            {currentQuestion.word.word}
          </h2>

          {/* 🌟 4. 手動で音声を鳴らすボタン（聞き直したい時用） */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button onClick={() => playAudio(currentQuestion.word.word)} style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '20px', border: '1px solid #ccc', cursor: 'pointer', backgroundColor: 'white' }}>
              🔊 単語の発音を聞く
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentQuestion.choices.map(choice => (
              <button
                key={choice} onClick={() => onAnswerClick(choice)} disabled={answeredResult !== null}
                style={{
                  padding: '15px', fontSize: '18px', borderRadius: '5px', border: '1px solid #ccc', cursor: 'pointer',
                  backgroundColor: answeredResult ? (choice === currentQuestion.word.meaning ? '#4caf50' : (answeredResult === 'wrong' ? '#f44336' : '#f0f0f0')) : '#fff',
                  color: answeredResult && (choice === currentQuestion.word.meaning || answeredResult === 'wrong') ? 'white' : 'black'
                }}
              >
                {choice}
              </button>
            ))}
          </div>

          {answeredResult && answeredResult !== 'correct' && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffebee', borderRadius: '5px' }}>
              <h3 style={{ color: '#d32f2f', margin: '0 0 10px 0' }}>❌ 不正解</h3>
              <p><strong>正解:</strong> {currentQuestion.word.meaning}</p>

              {/* 🌟 5. 例文も読み上げられるように！ */}
              {currentQuestion.word.example_en && (
                <p>
                  <strong>例文:</strong> {currentQuestion.word.example_en}
                  <button onClick={() => playAudio(currentQuestion.word.example_en)} style={{ marginLeft: '10px', padding: '5px', borderRadius: '50%', border: 'none', background: '#ddd', cursor: 'pointer' }}>🔊</button>
                </p>
              )}
              {currentQuestion.word.example_ja && <p style={{ fontSize: '14px', color: '#555' }}>{currentQuestion.word.example_ja}</p>}

              <button onClick={goNext} style={{ width: '100%', padding: '15px', marginTop: '15px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '5px' }}>次へ</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}