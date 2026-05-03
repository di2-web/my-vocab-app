// src/StudyScreen.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeckStudy, type WordRow } from './useDeckStudy';
import { useAudio } from './useAudio';
import type { Deck } from './useDecks';

type Props = {
  user: any;
  deck: Deck;
  onBack: () => void;
};

type QuestionData = { word: WordRow; choices: string[] };

export default function StudyScreen({ user, deck, onBack }: Props) {
  const { words, stats, loading, generateNextQuestion, handleAnswer, resetSession } = useDeckStudy(user.id, deck.id);
  const { playAudio } = useAudio();

  // 🌟 スマホ判定
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [screen, setScreen] = useState<'HOME' | 'QUIZ'>('HOME');
  const [sessionCount, setSessionCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [answeredResult, setAnsweredResult] = useState<'correct' | 'wrong' | 'skip' | null>(null);

  const timerRef = useRef<number | null>(null);

  const loadQuestion = useCallback(() => {
    // 🌟 スマホは4択、PCは8択を指定
    const nextQ = generateNextQuestion(isMobile ? 4 : 8);
    if (!nextQ) {
      alert("このセットの単語はすべて学習しました！");
      setScreen('HOME');
      return;
    }
    setCurrentQuestion(nextQ);
    setAnsweredResult(null);
    playAudio(nextQ.word.word);
  }, [generateNextQuestion, playAudio, isMobile]);

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
    let result: 'correct' | 'wrong' | 'skip';

    if (choice === null) result = 'skip'; // わからない
    else if (choice === word.meaning) result = 'correct';
    else result = 'wrong';

    setAnsweredResult(result);
    handleAnswer(word.id, result);

    // スマホの場合は自動進行を少し長めにする等も可能ですが、今回は統一で800ms
    if (result === 'correct') {
      timerRef.current = window.setTimeout(goNext, 800);
    }
  }, [currentQuestion, answeredResult, handleAnswer, goNext]);

  // 🌟 キーボード（テンキー）操作の追加
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'QUIZ' || !currentQuestion || isMobile) return;

      if (!answeredResult) {
        // 1〜8キーで回答
        if (e.key >= '1' && e.key <= '8') {
          const idx = parseInt(e.key, 10) - 1;
          if (idx < currentQuestion.choices.length) {
            onAnswerClick(currentQuestion.choices[idx]);
          }
        }
        // 9キーで「わからない」
        else if (e.key === '9') {
          onAnswerClick(null);
        }
      } else {
        // 結果表示中は Enter で次へ
        if (e.key === 'Enter') {
          goNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, currentQuestion, answeredResult, isMobile, onAnswerClick, goNext]);

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
            <h3 style={{ margin: '0 0 15px 0' }}>📈 このセットの学習状況</h3>
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
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: isMobile ? '80vh' : '60vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>{sessionCount} 問目</span>
            <button onClick={() => setScreen('HOME')}>✖ 中断</button>
          </div>

          <h2 style={{ fontSize: isMobile ? '36px' : '44px', textAlign: 'center', margin: '10px 0' }}>
            {currentQuestion.word.word}
          </h2>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button onClick={() => playAudio(currentQuestion.word.word)} style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '20px', border: '1px solid #ccc', cursor: 'pointer', backgroundColor: 'white' }}>
              🔊 発音を聞く
            </button>
          </div>

          {/* 🌟 PCは3列グリッド、スマホは1列縦並びに変更 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '10px'
          }}>
            {currentQuestion.choices.map((choice, i) => (
              <button
                key={choice} onClick={() => onAnswerClick(choice)} disabled={answeredResult !== null}
                style={{
                  padding: '15px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start',
                  backgroundColor: answeredResult ? (choice === currentQuestion.word.meaning ? '#4caf50' : (answeredResult === 'wrong' ? '#f44336' : '#f0f0f0')) : '#fff',
                  color: answeredResult && (choice === currentQuestion.word.meaning || answeredResult === 'wrong') ? 'white' : 'black'
                }}
              >
                {!isMobile && <span style={{ marginRight: '10px', fontSize: '12px', opacity: 0.6 }}>[{i + 1}]</span>}
                {choice}
              </button>
            ))}
            {/* 🌟 わからないボタン (PCでは [9] キー) */}
            <button
              onClick={() => onAnswerClick(null)} disabled={answeredResult !== null}
              style={{ padding: '15px', fontSize: '14px', borderRadius: '5px', border: 'none', backgroundColor: '#e0e0e0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start' }}
            >
              {!isMobile && <span style={{ marginRight: '10px', fontSize: '12px', opacity: 0.6 }}>[9]</span>}
              🤔 わからない
            </button>
          </div>

          {answeredResult && answeredResult !== 'correct' && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
              <h3 style={{ color: answeredResult === 'skip' ? '#1976d2' : '#d32f2f', margin: '0 0 10px 0' }}>
                {answeredResult === 'skip' ? '💡 答え' : '❌ 不正解'}
              </h3>
              <p><strong>正解:</strong> {currentQuestion.word.meaning}</p>

              {currentQuestion.word.example_en && (
                <p>
                  <strong>例文:</strong> {currentQuestion.word.example_en}
                  <button onClick={() => playAudio(currentQuestion.word.example_en)} style={{ marginLeft: '10px', padding: '5px', borderRadius: '50%', border: 'none', background: '#ddd', cursor: 'pointer' }}>🔊</button>
                </p>
              )}
              {currentQuestion.word.example_ja && <p style={{ fontSize: '14px', color: '#555' }}>{currentQuestion.word.example_ja}</p>}

              <button onClick={goNext} style={{ width: '100%', padding: '15px', marginTop: '15px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
                次の問題へ {(!isMobile && '(Enter)')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}