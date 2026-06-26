// src/StudyScreen.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeckStudy, type WordRow } from './useDeckStudy';
import { useAudio } from './useAudio';
import type { Deck } from './useDecks';
import type { User } from '@supabase/supabase-js';

type Props = {
  user: User;
  deck: Deck;
  onBack: () => void;
};

type QuestionData = { word: WordRow; choices: string[] };

export default function StudyScreen({ user, deck, onBack }: Props) {
  const [selectedPart, setSelectedPart] = useState<number>(-1); // -1: すべて
  const { words, totalAllWordsCount, stats, loading, generateNextQuestion, handleAnswer, resetSession } = useDeckStudy(user.id, deck.id, selectedPart);
  const { playAudio } = useAudio();

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
    const nextQ = generateNextQuestion(isMobile ? 4 : 8);
    if (!nextQ) {
      alert("選択されたパートの単語はすべて学習しました！");
      setScreen('HOME');
      return;
    }
    setCurrentQuestion(nextQ);
    setAnsweredResult(null);
    playAudio(nextQ.word.word, nextQ.word.audio_tango);
  }, [generateNextQuestion, playAudio, isMobile]);

  const startSession = () => {
    resetSession();
    setSessionCount(1);
    loadQuestion();
    setScreen('QUIZ');
  };

  // 💡 安全対策: goNextが呼ばれたら、待機中の自動遷移タイマーを完全に消去する
  const goNext = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setSessionCount(prev => prev + 1);
    loadQuestion();
  }, [loadQuestion]);

  const onAnswerClick = useCallback((choice: string | null) => {
    if (!currentQuestion || answeredResult) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const { word } = currentQuestion;
    let result: 'correct' | 'wrong' | 'skip';

    if (choice === null) result = 'skip';
    else if (choice === word.meaning) result = 'correct';
    else result = 'wrong';

    setAnsweredResult(result);
    handleAnswer(word.id, result);

    if (result === 'correct') {
      // 正解時は0.8秒後に自動で次へ（この間にEnterを押してもgoNextで重複発火しないようガード）
      timerRef.current = window.setTimeout(goNext, 800);
    }
  }, [currentQuestion, answeredResult, handleAnswer, goNext]);

  // 💡 キーボード操作の監視（画面サイズでの制限を撤廃）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'QUIZ' || !currentQuestion) return;

      if (!answeredResult) {
        // 未解答のとき: 1〜8キーで選択、9キーで「わからない」
        if (e.key >= '1' && e.key <= '8') {
          const idx = parseInt(e.key, 10) - 1;
          // 選択肢の数（スマホは4、PCは8）を超えていないキーのみ反応させる
          if (idx < currentQuestion.choices.length) {
            onAnswerClick(currentQuestion.choices[idx]);
          }
        } else if (e.key === '9') {
          onAnswerClick(null);
        }
      } else {
        // 回答済みのとき: Enterキーで次の問題に進む（自動遷移待ちの correct 時でもEnterスキップ可能）
        if (e.key === 'Enter') {
          goNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, currentQuestion, answeredResult, onAnswerClick, goNext]);

  // パート分けのセレクトボックスの選択肢を生成
  const partCount = Math.ceil(totalAllWordsCount / 100);
  const partOptions = [];
  if (deck.id !== 'weak' && partCount > 1) {
    for (let i = 0; i < partCount; i++) {
      const startRange = i * 100 + 1;
      const endRange = Math.min((i + 1) * 100, totalAllWordsCount);
      partOptions.push({
        value: i,
        label: `パート ${i + 1} (${startRange}〜${endRange}語目)`,
      });
    }
  }

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text)' }}>データの読み込み中...</div>;
  if (words.length === 0 && selectedPart !== -1) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', padding: '20px' }}>
        <h2 style={{ color: 'var(--text-h)' }}>このパートに単語がありません</h2>
        <button className="btn btn-secondary" onClick={() => setSelectedPart(-1)}>すべて表示に戻す</button>
      </div>
    );
  }

  if (totalAllWordsCount === 0) return (
    <div style={{ textAlign: 'center', marginTop: '50px', padding: '20px' }}>
      <h2 style={{ color: 'var(--text-h)' }}>単語が登録されていません</h2>
      <p style={{ color: 'var(--text)', marginBottom: '20px' }}>編集画面から単語を追加してください。</p>
      <button className="btn btn-secondary" onClick={onBack}>一覧に戻る</button>
    </div>
  );

  return (
    <div className="container">
      {screen === 'HOME' && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
            <button className="btn btn-secondary" onClick={onBack}>戻る</button>
          </div>

          <h1 style={{ fontSize: '32px', marginBottom: '20px', color: 'var(--text-h)' }}>{deck.name}</h1>

          {/* パート分割選択 */}
          {partOptions.length > 0 && (
            <div style={{ marginBottom: '20px', backgroundColor: 'var(--code-bg)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <label htmlFor="part-select" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-h)', fontWeight: 'bold' }}>学習範囲を選択</label>
              <select
                id="part-select"
                value={selectedPart}
                onChange={(e) => {
                  setSelectedPart(parseInt(e.target.value, 10));
                  resetSession();
                }}
                style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-h)' }}
              >
                <option value={-1}>すべて学習する ({totalAllWordsCount}語)</option>
                {partOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ backgroundColor: 'var(--code-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: 'var(--text-h)' }}>学習状況</h3>
            <p style={{ color: 'var(--text)' }}>対象の単語数: <strong style={{ color: 'var(--text-h)' }}>{stats.totalWords} 語</strong></p>
            <div style={{ display: 'flex', height: '12px', backgroundColor: 'var(--border)', borderRadius: '6px', overflow: 'hidden', margin: '15px 0' }}>
              <div style={{ width: `${(stats.learnedCount / Math.max(stats.totalWords, 1)) * 100}%`, backgroundColor: 'var(--accent)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text)' }}>
              <span>習得済: <strong style={{ color: 'var(--accent)' }}>{stats.learnedCount}</strong></span>
              <span>未学習: <strong style={{ color: 'var(--text-h)' }}>{stats.unlearnedCount}</strong></span>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-primary" onClick={startSession} style={{ padding: '12px 30px', fontSize: '18px', width: '100%' }}>
              学習をスタートする
            </button>
          </div>
        </div>
      )}

      {screen === 'QUIZ' && currentQuestion && (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '60vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <span style={{ color: 'var(--text)', fontSize: '14px' }}>{sessionCount} 問目</span>
            <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '14px' }} onClick={() => setScreen('HOME')}>中断</button>
          </div>

          <h2 style={{ fontSize: isMobile ? '36px' : '48px', textAlign: 'center', margin: '20px 0', color: 'var(--text-h)' }}>
            {currentQuestion.word.word}
          </h2>

          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }} onClick={() => playAudio(currentQuestion.word.word, currentQuestion.word.audio_tango)}>
              発音を聞く
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '20px'
          }}>
            {currentQuestion.choices.map((choice, i) => (
              <button
                key={choice} onClick={() => onAnswerClick(choice)} disabled={answeredResult !== null}
                style={{
                  padding: '16px', fontSize: '16px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                  backgroundColor: answeredResult ? (choice === currentQuestion.word.meaning ? 'var(--accent-bg)' : (answeredResult === 'wrong' && choice !== currentQuestion.word.meaning ? 'var(--bg)' : 'var(--bg)')) : 'var(--bg)',
                  borderColor: answeredResult ? (choice === currentQuestion.word.meaning ? 'var(--accent-border)' : 'var(--border)') : 'var(--border)',
                  color: 'var(--text-h)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ marginRight: '10px', fontSize: '12px', opacity: 0.5, backgroundColor: 'var(--code-bg)', padding: '2px 6px', borderRadius: '4px' }}>{i + 1}</span>
                {choice}
              </button>
            ))}

            <button
              onClick={() => onAnswerClick(null)} disabled={answeredResult !== null}
              style={{
                padding: '16px', fontSize: '15px', borderRadius: '8px', border: '1px solid var(--border)',
                backgroundColor: 'var(--code-bg)', color: 'var(--text)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-start'
              }}
            >
              <span style={{ marginRight: '10px', fontSize: '12px', opacity: 0.5, backgroundColor: 'var(--bg)', padding: '2px 6px', borderRadius: '4px' }}>9</span>
              わからない
            </button>
          </div>

          {answeredResult && answeredResult !== 'correct' && (
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: 'var(--code-bg)', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'left' }}>
              <h3 style={{ color: 'var(--text-h)', fontSize: '18px', margin: '0 0 10px 0' }}>
                {answeredResult === 'skip' ? '答え' : '不正解'}
              </h3>
              <p style={{ fontSize: '18px', marginBottom: '15px' }}><strong style={{ color: 'var(--text-h)' }}>正解:</strong> {currentQuestion.word.meaning}</p>

              {currentQuestion.word.example_en && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '15px', marginTop: '15px' }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 5px 0', color: 'var(--text-h)' }}>
                    <strong>例文:</strong> {currentQuestion.word.example_en}
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => playAudio(currentQuestion.word.example_en, currentQuestion.word.audio_reibun)}>再生</button>
                  </p>
                  {currentQuestion.word.example_ja && <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>{currentQuestion.word.example_ja}</p>}
                </div>
              )}

              <button className="btn btn-primary" onClick={goNext} style={{ width: '100%', padding: '12px', marginTop: '20px' }}>
                次の問題へ (Enter)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}