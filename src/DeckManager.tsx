// src/DeckManager.tsx
import { useState } from 'react';
import { useDecks, type Deck } from './useDecks';

type Props = {
  userId: string;
  onSelectStudy: (deck: Deck) => void;
  onSelectEdit: (deck: Deck) => void;
  onOpenDashboard: () => void;
};

export default function DeckManager({ userId, onSelectStudy, onSelectEdit, onOpenDashboard }: Props) {
  const { decks, loading, createDeck, deleteDeck } = useDecks(userId);
  const [newDeckName, setNewDeckName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createDeck(newDeckName);
    setNewDeckName('');
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text)' }}>読み込み中...</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>

      <button
        onClick={onOpenDashboard}
        style={{
          width: '100%', padding: '16px', backgroundColor: 'var(--accent)', color: 'white',
          fontSize: '16px', fontWeight: 'bold', border: 'none', borderRadius: '8px',
          cursor: 'pointer', marginBottom: '30px', transition: 'opacity 0.2s',
          boxShadow: 'var(--shadow)'
        }}
        onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
      >
        分析 ＆ 苦手特訓ダッシュボードを表示
      </button>

      <h2 style={{ fontSize: '20px', color: 'var(--text-h)', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
        学習セット一覧
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
        {decks.map(deck => (
          <div
            key={deck.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              backgroundColor: 'var(--code-bg)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              /* 💡 スマホ等で横幅が狭い場合、ボタン群を下に回り込ませてはみ出しを防止します */
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            {/* テキストエリア */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', minWidth: '150px', flex: '1 1 auto' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-h)' }}>{deck.name}</span>
              {deck.is_default && (
                <span style={{ fontSize: '11px', color: 'var(--text)', opacity: 0.8 }}>公式セット</span>
              )}
            </div>
            {/* ボタン群 */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {!deck.is_default ? (
                <>
                  <button
                    onClick={() => onSelectEdit(deck)}
                    style={{ padding: '8px 14px', backgroundColor: 'var(--bg)', color: 'var(--text-h)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                  >
                    編集
                  </button>
                  <button
                    onClick={() => deleteDeck(deck.id)}
                    style={{ padding: '8px 14px', backgroundColor: 'transparent', color: '#e53935', border: '1px solid #ffcdd2', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                  >
                    削除
                  </button>
                </>
              ) : null}
              <button
                onClick={() => onSelectStudy(deck)}
                style={{ padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
              >
                学習
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '24px', backgroundColor: 'var(--code-bg)', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'left' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--text-h)' }}>新規セットの作成</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text" value={newDeckName} onChange={e => setNewDeckName(e.target.value)}
            placeholder="セットの名前を入力" required
            style={{
              flexGrow: 1, padding: '12px', borderRadius: '6px', border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)', color: 'var(--text-h)', fontSize: '14px', minWidth: '180px'
            }}
          />
          <button type="submit" style={{ padding: '12px 24px', backgroundColor: 'var(--text-h)', color: 'var(--bg)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', width: '100%', maxWidth: '120px' }}>
            作成
          </button>
        </form>
      </div>
    </div>
  );
}