// src/Dashboard.tsx
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import wordsData from './words.json';
import type { Deck } from './useDecks';

type Props = {
  userId: string;
  onBack: () => void;
  onStartWeakStudy: (deck: Deck) => void;
};

export default function Dashboard({ userId, onBack, onStartWeakStudy }: Props) {
  const [stats, setStats] = useState({ totalAnswers: 0, accuracy: 0, learned: 0, learning: 0 });
  const [weakRanking, setWeakRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      const { data: pData } = await supabase.from('progress').select('*').eq('user_id', userId);

      if (!pData || pData.length === 0) {
        setLoading(false);
        return;
      }

      let totalCorrect = 0;
      let totalWrong = 0;
      let learned = 0;
      let learning = 0;

      // 苦手ランキング用の箱
      const weakList = pData.filter(p => p.wrong_count > 0).sort((a, b) => b.wrong_count - a.wrong_count).slice(0, 10);

      pData.forEach(p => {
        totalCorrect += p.correct_count;
        totalWrong += p.wrong_count;
        if (p.stage === 2) learned++;
        else if (p.stage >= -2 && p.stage < 2) learning++;
      });

      setStats({
        totalAnswers: totalCorrect + totalWrong,
        accuracy: totalCorrect + totalWrong === 0 ? 0 : Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100),
        learned,
        learning
      });

      // 苦手ランキングの実単語データを取得して合体させる
      const weakIds = weakList.map(p => p.word_id);
      const customIds = weakIds.filter(id => id.length > 10);

      let customWords: any[] = [];
      if (customIds.length > 0) {
        const { data: cwData } = await supabase.from('words').select('id, word, meaning').in('id', customIds);
        if (cwData) customWords = cwData;
      }

      const defaultWords = (wordsData as any[])
        .filter(w => weakIds.includes(String(w.id)))
        .map(w => ({ id: String(w.id), word: w.word, meaning: w.quiz.answer }));

      const allWords = [...customWords, ...defaultWords];

      const ranking = weakList.map(p => {
        const wordInfo = allWords.find(w => w.id === p.word_id);
        return { ...p, wordInfo: wordInfo || { word: '不明', meaning: '不明' } };
      });

      setWeakRanking(ranking);
      setLoading(false);
    };

    fetchAnalytics();
  }, [userId]);

  const handleStartWeak = () => {
    // 💡 仮想デッキ「weak」を渡して学習画面を起動
    onStartWeakStudy({ id: 'weak', name: '🔥 苦手特訓モード' });
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>データ分析中...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ marginBottom: '20px', cursor: 'pointer' }}>← セット一覧に戻る</button>

      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>📊 総合分析ダッシュボード</h2>

      {stats.totalAnswers === 0 ? (
        <p style={{ textAlign: 'center' }}>まだ学習データがありません。クイズをプレイしてデータを集めましょう！</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
            <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#1565c0' }}>総解答数</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0d47a1' }}>{stats.totalAnswers} <span style={{ fontSize: '16px' }}>問</span></div>
            </div>
            <div style={{ backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#2e7d32' }}>全体正答率</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1b5e20' }}>{stats.accuracy} <span style={{ fontSize: '16px' }}>%</span></div>
            </div>
            <div style={{ backgroundColor: '#fff8e1', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#f57f17' }}>習得済み単語</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f57f17' }}>{stats.learned} <span style={{ fontSize: '16px' }}>語</span></div>
            </div>
            <div style={{ backgroundColor: '#f3e5f5', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6a1b9a' }}>学習中の単語</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6a1b9a' }}>{stats.learning} <span style={{ fontSize: '16px' }}>語</span></div>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffebee', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#d32f2f' }}>⚠️ 苦手な単語トップ10</h3>
            {weakRanking.length === 0 ? <p>苦手な単語はありません！素晴らしい！</p> : (
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '16px' }}>
                {weakRanking.map(r => (
                  <li key={r.word_id} style={{ marginBottom: '8px' }}>
                    <strong>{r.wordInfo.word}</strong> ({r.wordInfo.meaning})
                    <span style={{ color: '#d32f2f', marginLeft: '10px' }}>❌ {r.wrong_count}回ミス</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={handleStartWeak} disabled={weakRanking.length === 0}
            style={{ width: '100%', padding: '20px', fontSize: '20px', backgroundColor: weakRanking.length === 0 ? '#ccc' : '#f44336', color: 'white', border: 'none', borderRadius: '10px', cursor: weakRanking.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
          >
            🔥 苦手特訓モードを開始する
          </button>
        </>
      )}
    </div>
  );
}