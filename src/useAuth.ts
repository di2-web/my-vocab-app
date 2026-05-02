// src/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  // Auth（ログイン状態）のロード
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  // Profile（アクセスコード）のロード状態と結果
  const [isVerified, setIsVerified] = useState<'loading' | boolean>('loading');

  const checkVerification = useCallback(async (userId: string) => {
    setIsVerified('loading'); // プロフィール取得フェーズ開始
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', userId)
        .single();

      if (error) throw error; // 💡 追加：エラーがあれば catch ブロックへ飛ばす

      if (data) {
        setIsVerified(data.is_verified);
      } else {
        setIsVerified(false);
      }
    } catch (err) {
      console.error("🚨 プロフィール取得エラー:", err);
      // 通信エラー等は安全側に倒してGateへ送る（再入力・再試行を促す）
      setIsVerified(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          // 💡 ここで Auth の責務は完了（確実にロード状態を解除）
          setAuthLoading(false);

          // 後追いで Profile フェーズへ
          if (currentUser) {
            checkVerification(currentUser.id);
          } else {
            setIsVerified(false);
          }
        }
      } catch (err) {
        console.error("🚨 セッション初期化エラー:", err);
        if (mounted) {
          setAuthLoading(false);
          setIsVerified(false);
        }
      }
    };

    initAuth();

    // INITIAL_SESSIONのすれ違いを気にせず、差分変化のみを担当させる
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          checkVerification(currentUser.id);
        } else {
          setIsVerified(false);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [checkVerification]);

  return { user, authLoading, isVerified, setIsVerified };
};