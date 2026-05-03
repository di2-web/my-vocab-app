// src/DeckManager.tsx
import { useState } from 'react';
import { useDecks, type Deck } from './useDecks';

type Props = {
  userId: string;
  onSelectStudy: (deck: Deck) => void;
  onSelectEdit: (deck: Deck) => void;
  onOpenDashboard: () => void; // 🌟 これを追加
};

export default function DeckManager({ userId, onSelectStudy, onSelectEdit, onOpenDashboard }: Props) {
  const { decks, loading, createDeck } = useDecks(userId);
  const [newDeckName, setNewDeckName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createDeck(newDeckName);
    setNewDeckName('');
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '50px' }}>読み込み中...</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>

      {/* 🌟 グラフを開く大きなボタンを追加！ */}
      <button
        onClick={onOpenDashboard}
        style={{ width: '100%', padding: '15px', backgroundColor: '#673ab7', color: 'white', fontSize: '18px', fontWeight: 'bold', border: 'none', borderRadius: '10px', cursor: 'pointer', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
      >
        📊 総合分析 ＆ 苦手特訓ダッシュボード
      </button>

      <h2 style={{ textAlign: 'center' }}>📚 学習セットを選ぶ</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
        {decks.map(deck => (
          <div key={deck.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: deck.is_default ? '#e3f2fd' : '#f9f9f9', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{deck.name}</span>
            <div>
              {!deck.is_default && (
                <button onClick={() => onSelectEdit(deck)} style={{ marginRight: '10px', padding: '8px 15px', backgroundColor: '#9e9e9e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                  ✏️ 編集
                </button>
              )}
              <button onClick={() => onSelectStudy(deck)} style={{ padding: '8px 15px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                ▶️ 学習
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '20px', backgroundColor: '#fff3e0', borderRadius: '10px' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>➕ 新しいセットを作る</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text" value={newDeckName} onChange={e => setNewDeckName(e.target.value)}
            placeholder="例: 学校の宿題リスト" required
            style={{ flexGrow: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
          />
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            作成
          </button>
        </form>
      </div>
    </div>
  );
}