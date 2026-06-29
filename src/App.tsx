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
import Dashboard from './Dashboard';
import type { User } from '@supabase/supabase-js';

// ------ MainApp コンポーネント ------
function MainApp({ user }: { user: User }) {
  const [screen, setScreen] = useState<'DECKS' | 'STUDY' | 'EDIT' | 'DASHBOARD'>('DECKS');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);

  const handleSelectStudy = (deck: Deck) => {
    setSelectedDeck(deck);
    setScreen('STUDY');
  };

  const handleSelectEdit = (deck: Deck) => {
    setSelectedDeck(deck);
    setScreen('EDIT');
  };

  return (
    /* 💡 maxWidth を 900px に拡張 */
    <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>

      <div style={{ textAlign: 'right', marginBottom: '10px' }}>
        <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: '#757575', cursor: 'pointer', textDecoration: 'underline' }}>ログアウト</button>
      </div>

      {screen === 'DECKS' && (
        <DeckManager
          userId={user.id}
          onSelectStudy={handleSelectStudy}
          onSelectEdit={handleSelectEdit}
          onOpenDashboard={() => setScreen('DASHBOARD')}
        />
      )}

      {screen === 'STUDY' && selectedDeck && (
        <StudyScreen user={user} deck={selectedDeck} onBack={() => setScreen('DECKS')} />
      )}

      {screen === 'EDIT' && selectedDeck && (
        <DeckEditor deck={selectedDeck} onBack={() => setScreen('DECKS')} />
      )}

      {screen === 'DASHBOARD' && (
        <Dashboard
          userId={user.id}
          onBack={() => setScreen('DECKS')}
          onStartWeakStudy={handleSelectStudy}
        />
      )}
    </div>
  );
}

// ------ アプリのエントリポイント ------
export default function App() {
  const { user, authLoading, isVerified, setIsVerified } = useAuth();

  if (authLoading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>認証状態を確認中...</div>;
  }

  if (!user) {
    return <Auth />;
  }

  if (isVerified === 'loading') {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>ユーザー情報を読み込み中...</div>;
  }

  if (isVerified === false) {
    return <AccessGate onVerified={() => setIsVerified(true)} />;
  }

  return <MainApp user={user} />;
}