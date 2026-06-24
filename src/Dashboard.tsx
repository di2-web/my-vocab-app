// src/Dashboard.tsx
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import toshinDataRaw from './words_toshin1800.json';
import targetDataRaw from './words_target1900.json';
import type { Deck } from './useDecks';
import type { WordData } from './useDeckStudy';

type Props = {
  userId: string;
  onBack: () => void;
  onStartWeakStudy: (deck: Deck) => void;
};

type WeakRankingItem = {
  word_id: string;
  stage: number;
  next_show_at: number;
  correct_count: number;
  wrong_count: number;
  wordInfo: {
    word: string;
    meaning: string;
  };
};

export default function Dashboard({ userId, onBack, onStartWeakStudy }: Props) {
  const [stats, setStats] = useState({ totalAnswers: 0, accuracy: 0, learned: 0, learning: 0 });
  const [weakRanking, setWeakRanking] = useState<WeakRankingItem[]>([]);
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

      const weakIds = weakList.map(p => p.word_id);
      const customIds = weakIds.filter(id => id.length > 10);

      let customWords: Array<{ id: string; word: string; meaning: string }> = [];
      if (customIds.length > 0) {
        const { data: cwData } = await supabase.from('words').select('id, word, meaning').in('id', customIds);
        if (cwData) customWords = cwData as Array<{ id: string; word: string; meaning: string }>;
      }

      const defaultWordsToshin = (toshinDataRaw as WordData[]).map(w => ({
        id: String(w.id),
        word: w.word,
        meaning: w.quiz.answer
      }));

      const defaultWordsTarget = (targetDataRaw as WordData[]).map(w => ({
        id: `target_${w.id}`,
        word: w.word,
        meaning: w.quiz.answer
      }));

      const defaultWords = [...defaultWordsToshin, ...defaultWordsTarget];
      const defaultWordsFiltered = defaultWords.filter(w => weakIds.includes(w.id));

      const allWords = [...customWords, ...defaultWordsFiltered];

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
    onStartWeakStudy({ id: 'weak', name: '苦手特訓モード' });
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text)' }}>データ分析中...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={onBack}>一覧に戻る</button>
      </div>

      <h2 style={{ textAlign: 'center', marginBottom: '25px', color: 'var(--text-h)' }}>総合分析ダッシュボード</h2>

      {stats.totalAnswers === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text)' }}>学習データがありません。クイズをプレイしてデータを集めましょう。</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '30px' }}>
            <div style={{ backgroundColor: 'var(--code-bg)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>総解答数</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-h)' }}>{stats.totalAnswers} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>問</span></div>
            </div>
            <div style={{ backgroundColor: 'var(--code-bg)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>全体正答率</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-h)' }}>{stats.accuracy} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>%</span></div>
            </div>
            <div style={{ backgroundColor: 'var(--code-bg)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>習得済み単語</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-h)' }}>{stats.learned} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>語</span></div>
            </div>
            <div style={{ backgroundColor: 'var(--code-bg)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>学習中の単語</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-h)' }}>{stats.learning} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>語</span></div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--code-bg)', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: 'var(--text-h)' }}>苦手な単語トップ10</h3>
            {weakRanking.length === 0 ? (
              <p style={{ color: 'var(--text)', fontSize: '14px' }}>苦手な単語はありません。</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: 'var(--text-h)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {weakRanking.map(r => (
                  <li key={r.word_id}>
                    <strong>{r.wordInfo.word}</strong> <span style={{ color: 'var(--text)' }}>({r.wordInfo.meaning})</span>
                    <span style={{ color: '#e53935', fontWeight: 'bold', marginLeft: '10px' }}>ミス: {r.wrong_count}回</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={handleStartWeak}
            disabled={weakRanking.length === 0}
            className="btn btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: '16px', cursor: weakRanking.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            苦手特訓モードを開始する
          </button>
        </>
      )}
    </div>
  );
}