// src/AccessGate.tsx
import { useState } from 'react';
import { supabase } from './lib/supabase';

export default function AccessGate({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.rpc('verify_access_code', { input_code: code });

    if (error) {
      setErrorMsg('通信エラーが発生しました。');
    } else if (data === true) {
      onVerified();
    } else {
      setErrorMsg('アクセスコードが間違っています。');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', textAlign: 'center', backgroundColor: '#fff3e0', borderRadius: '10px', border: '1px solid #ffb74d' }}>
      <h2>🔒 アクセス制限</h2>
      <p>このアプリを利用するにはアクセスコードが必要です。</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <input
          type="text" placeholder="アクセスコードを入力" value={code}
          onChange={(e) => setCode(e.target.value)} required
          style={{ padding: '10px', fontSize: '16px', textAlign: 'center' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer' }}>
          {loading ? '確認中...' : '認証する'}
        </button>
      </form>
      {errorMsg && <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMsg}</p>}

      <button onClick={() => supabase.auth.signOut()} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#757575', cursor: 'pointer', textDecoration: 'underline' }}>
        ログアウト
      </button>
    </div>
  );
}