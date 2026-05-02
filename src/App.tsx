// src/App.tsx
import { useState } from 'react';
import { supabase } from './lib/supabase';
import { useAuth } from './useAuth';
import Auth from './Auth';
import AccessGate from './AccessGate';
import DeckManager from './DeckManager';
import DeckEditor from './DeckEditor';
import StudyScreen from './StudyScreen';
import type { Deck } from './useDecks';

// ------ MainApp コンポーネント ------
function MainApp({ user }: { user: any }) {
  const [screen, setScreen] = useState<'DECKS' | 'STUDY' | 'EDIT'>('DECKS');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);

  const handleSelectStudy = (deck: Deck) => {
    // 💡 alertを消して、そのままセットして画面を切り替える
    setSelectedDeck(deck);
    setScreen('STUDY');
  };

  const handleSelectEdit = (deck: Deck) => {
    setSelectedDeck(deck);
    setScreen('EDIT');
  };

  return (
    <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>

      <div style={{ textAlign: 'right', marginBottom: '10px' }}>
        <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: '#757575', cursor: 'pointer', textDecoration: 'underline' }}>ログアウト</button>
      </div>

      {screen === 'DECKS' && (
        <DeckManager userId={user.id} onSelectStudy={handleSelectStudy} onSelectEdit={handleSelectEdit} />
      )}

      {screen === 'STUDY' && selectedDeck && (
        <StudyScreen user={user} deck={selectedDeck} onBack={() => setScreen('DECKS')} />
      )}

      {screen === 'EDIT' && selectedDeck && (
        <DeckEditor deck={selectedDeck} onBack={() => setScreen('DECKS')} />
      )}
    </div>
  );
}

// ------ アプリのエントリポイント（認証・ゲート管理） ------
export default function App() {
  const { user, authLoading, isVerified, setIsVerified } = useAuth();

  // 1. Auth（ログイン状態）の確認中
  if (authLoading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>認証状態を確認中...</div>;
  }

  // 2. 未ログイン
  if (!user) {
    return <Auth />;
  }

  // 3. Profile（アクセスコード）の確認中
  if (isVerified === 'loading') {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>ユーザー情報を読み込み中...</div>;
  }

  // 4. アクセスコード未入力（または通信エラー）
  if (isVerified === false) {
    // 💡 リロードではなく、親の状態を直接更新する
    return <AccessGate onVerified={() => setIsVerified(true)} />;
  }

  // 5. すべてクリア！メインアプリ表示
  return <MainApp user={user} />;
}