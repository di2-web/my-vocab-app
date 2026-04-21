// src/useAuth.ts
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkVerification(session.user.id);
      } else {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await checkVerification(session.user.id);
        } else {
          setIsVerified(false);
          setLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkVerification = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setIsVerified(data.is_verified);
      }
    } catch (err) {
      console.error("プロフィール取得エラー:", err);
    } finally {
      setLoading(false);
    }
  };

  return { user, isVerified, setIsVerified, loading };
};