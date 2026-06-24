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
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px 20px', textAlign: 'center', backgroundColor: 'var(--code-bg)', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      <h2 style={{ color: 'var(--text-h)', marginBottom: '15px' }}>アクセス制限</h2>
      <p style={{ color: 'var(--text)', fontSize: '14px', marginBottom: '20px' }}>このアプリを利用するにはアクセスコードが必要です。</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="text" placeholder="アクセスコードを入力" value={code}
          onChange={(e) => setCode(e.target.value)} required
          style={{ padding: '12px', fontSize: '16px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--bg)', color: 'var(--text-h)' }}
        />
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '12px', width: '100%' }}>
          {loading ? '確認中...' : '認証する'}
        </button>
      </form>
      {errorMsg && <p style={{ color: '#e53935', fontWeight: 'bold', fontSize: '14px', marginTop: '15px' }}>{errorMsg}</p>}

      <button onClick={() => supabase.auth.signOut()} style={{ marginTop: '25px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px' }}>
        ログアウト
      </button>
    </div>
  );
}