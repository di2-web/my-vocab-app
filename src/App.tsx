// src/App.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import type { WordData } from './types';
import { useQuizLogic } from './useQuizLogic';
import wordsData from './words.json';

type Screen = 'HOME' | 'QUIZ';
type QuestionData = { word: WordData; choices: string[] };

function App() {
  const allWords = wordsData as WordData[];

  // 🌟 UIはロジックから渡されたデータと関数を使うだけ
  const { userData, stats, generateNextQuestion, handleAnswer, resetSession } = useQuizLogic(allWords);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [screen, setScreen] = useState<Screen>('HOME');
  const [sessionCount, setSessionCount] = useState(0);

  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [answeredResult, setAnsweredResult] = useState<'correct' | 'wrong' | 'skip' | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  const playAudio = useCallback((fileName: string) => {
    const audio = new Audio(`/audio/${fileName}`);
    audio.play().catch(err => console.error("音声再生エラー:", err));
  }, []);

  const loadQuestion = useCallback(() => {
    // 🌟 選択肢の数 (スマホは4、PCは8) を指定して問題を生成してもらう
    const nextQ = generateNextQuestion(isMobile ? 4 : 8);
    if (!nextQ) {
      setScreen('HOME');
      return;
    }
    setCurrentQuestion(nextQ);
    setAnsweredResult(null);
    setStartTime(Date.now());

    if (nextQ.word.audio?.tango) {
      playAudio(nextQ.word.audio.tango);
    }
  }, [generateNextQuestion, isMobile, playAudio]);

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

  const quitSession = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setScreen('HOME');
  }, []);

  const onAnswerClick = useCallback((choice: string | null) => {
    if (!currentQuestion || answeredResult) return;

    // 🔥 ChatGPT指摘対応：ボタンを押した瞬間に、古いタイマーが残っていれば確実に消す
    if (timerRef.current) clearTimeout(timerRef.current);

    const responseTime = (Date.now() - startTime) / 1000;
    const { word } = currentQuestion;

    let result: 'correct' | 'wrong' | 'skip';
    if (choice === null) result = 'skip';
    else if (choice === word.quiz.answer) result = 'correct';
    else result = 'wrong';

    setAnsweredResult(result);
    handleAnswer(word.id, result, responseTime);

    // 🔥 Claude指摘対応：スマホでも、間違えた時・Skip時は自動進行させず、答えを確認させる！
    if (isMobile && result === 'correct') {
      timerRef.current = window.setTimeout(goNext, 800);
    }
  }, [currentQuestion, answeredResult, startTime, handleAnswer, isMobile, goNext]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'QUIZ' || isMobile || !currentQuestion) return;

      if (!answeredResult) {
        if (e.key >= '1' && e.key <= '8') {
          const index = parseInt(e.key, 10) - 1;
          if (currentQuestion.choices[index]) onAnswerClick(currentQuestion.choices[index]);
        } else if (e.key === '9') {
          onAnswerClick(null);
        }
      } else {
        if (e.key === 'Enter') {
          goNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, isMobile, answeredResult, currentQuestion, onAnswerClick, goNext]);

  return (
    <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto', padding: isMobile ? '10px' : '20px', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>

      {screen === 'HOME' && (
        <div style={{ marginTop: '20px' }}>
          <h1 style={{ textAlign: 'center' }}>英単語アプリ</h1>
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '10px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>📈 あなたの学習状況</h3>
            <p>総解答数: <strong>{userData.globalCount} 問</strong></p>
            <div style={{ display: 'flex', height: '20px', backgroundColor: '#e0e0e0', borderRadius: '10px', overflow: 'hidden', margin: '15px 0' }}>
              <div style={{ width: `${(stats.learnedCount / stats.totalWords) * 100}%`, backgroundColor: '#4caf50' }} />
              <div style={{ width: `${(stats.learningCount / stats.totalWords) * 100}%`, backgroundColor: '#ff9800' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#4caf50' }}>習得済: {stats.learnedCount}</span>
              <span style={{ color: '#ff9800' }}>学習中: {stats.learningCount}</span>
              <span style={{ color: '#9e9e9e' }}>未学習: {stats.unlearnedCount}</span>
            </div>
            {stats.weakWords.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#d32f2f' }}>⚠️ 苦手単語</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                  {stats.weakWords.map(w => (
                    <li key={w.id}><strong>{w.word}</strong>: {userData.progress[w.id].wrongCount}回ミス</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button onClick={startSession} style={{ padding: '15px 40px', fontSize: '18px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer' }}>
              学習をスタート ▶
            </button>
          </div>
        </div>
      )}

      {screen === 'QUIZ' && currentQuestion && (
        <div style={{ minHeight: isMobile ? '80vh' : '650px', display: 'flex', flexDirection: 'column' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#666', marginBottom: '10px' }}>
            <span>今 {sessionCount} 問目</span>
            <button onClick={quitSession} style={{ background: 'none', border: 'none', color: '#f44336', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
              ✖ 中断する
            </button>
          </div>

          <h2 style={{ fontSize: isMobile ? '36px' : '44px', textAlign: 'center', margin: '10px 0 20px' }}>
            {currentQuestion.word.word}
          </h2>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button onClick={() => playAudio(currentQuestion.word.audio.tango)} style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '20px', border: '1px solid #ccc', cursor: 'pointer', backgroundColor: 'white' }}>
              🔊 音声を聞く
            </button>
          </div>

          <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'row', gridTemplateColumns: isMobile ? 'none' : 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
            {currentQuestion.choices.map((choice, i) => {
              let bgColor = '#f0f0f0';
              let color = '#333';
              if (answeredResult) {
                if (choice === currentQuestion.word.quiz.answer) { bgColor = '#4caf50'; color = 'white'; }
                else if (answeredResult === 'wrong') { bgColor = '#f44336'; color = 'white'; }
              }
              return (
                <button key={choice} onClick={() => onAnswerClick(choice)} disabled={answeredResult !== null} style={{ padding: isMobile ? '20px' : '15px', fontSize: isMobile ? '18px' : '16px', backgroundColor: bgColor, color, border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                  {!isMobile && <span style={{ marginRight: '8px', opacity: 0.6, fontSize: '12px' }}>[{i + 1}]</span>}
                  {choice}
                </button>
              );
            })}
            <button onClick={() => onAnswerClick(null)} disabled={answeredResult !== null} style={{ padding: isMobile ? '20px' : '15px', fontSize: isMobile ? '16px' : '14px', backgroundColor: '#ddd', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              {!isMobile && <span style={{ marginRight: '8px', opacity: 0.6, fontSize: '12px' }}>[9]</span>}
              わからない
            </button>
          </div>

          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {answeredResult && (
              <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '5px', textAlign: isMobile ? 'center' : 'left' }}>
                <h3 style={{ margin: '0 0 10px 0', color: answeredResult === 'correct' ? '#4caf50' : '#f44336', fontSize: isMobile ? '24px' : '20px' }}>
                  {answeredResult === 'correct' ? '⭕ 正解！' : answeredResult === 'skip' ? '💡 答え' : '❌ 不正解...'}
                </h3>

                {isMobile ? (
                  // 🔥 スマホで不正解時は、自動進行しないので「次へ」ボタンを出す
                  <>
                    {answeredResult !== 'correct' && <p style={{ fontSize: '20px', margin: '0 0 15px 0' }}><strong>{currentQuestion.word.quiz.answer}</strong></p>}
                    {answeredResult !== 'correct' && (
                      <button onClick={goNext} style={{ width: '100%', padding: '15px', fontSize: '16px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        次へ
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p style={{ margin: '0 0 10px 0' }}><strong>正解:</strong> {currentQuestion.word.quiz.answer}</p>
                    <p style={{ margin: '0 0 5px 0' }}>
                      <strong>例文:</strong> {currentQuestion.word.example.en}
                      <button onClick={() => playAudio(currentQuestion.word.audio.reibun)} style={{ marginLeft: '10px', cursor: 'pointer' }}>🔊</button>
                    </p>
                    <p style={{ margin: '0', color: '#555', fontSize: '14px' }}>{currentQuestion.word.example.ja}</p>
                    <button onClick={goNext} style={{ width: '100%', padding: '15px', fontSize: '16px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '5px', marginTop: '15px', cursor: 'pointer' }}>
                      次の問題へ (Enter)
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;