// src/Auth.tsx
import { useState } from 'react';
import { supabase } from './lib/supabase';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
    } else if (isSignUp) {
      setMessage('登録完了しました！ログインしてください。');
      setIsSignUp(false);
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '10px' }}>
      <h2>{isSignUp ? '新規登録' : 'ログイン'}</h2>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="email" placeholder="メールアドレス" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <input
          type="password" placeholder="パスワード (6文字以上)" value={password}
          onChange={(e) => setPassword(e.target.value)} required
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer' }}>
          {loading ? '処理中...' : (isSignUp ? '登録する' : 'ログイン')}
        </button>
      </form>
      {message && <p style={{ color: 'red', marginTop: '15px' }}>{message}</p>}
      <button onClick={() => setIsSignUp(!isSignUp)} style={{ marginTop: '15px', background: 'none', border: 'none', color: '#2196f3', cursor: 'pointer', textDecoration: 'underline' }}>
        {isSignUp ? 'すでにアカウントをお持ちの方はこちら' : '新しくアカウントを作成する'}
      </button>
    </div>
  );
}