// src/useDecks.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';

export type Deck = {
  id: string;
  name: string;
  is_default?: boolean;
};

export const useDecks = (userId: string | undefined) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDecks = useCallback(async () => {
    if (!userId) return;

    // Supabaseから自分のデッキを取得
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("デッキ取得エラー:", error);
    } else {
      // デフォルトの公式セットを追加してセット
      const toshinDeck: Deck = { id: 'toshin1800', name: '⭐️ 東進の英単語1800', is_default: true };
      const targetDeck: Deck = { id: 'target1900', name: '⭐️ ターゲットの友1900', is_default: true };
      setDecks([toshinDeck, targetDeck, ...(data || [])]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDecks();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDecks]);

  const createDeck = async (name: string) => {
    if (!userId || !name.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from('decks')
      .insert([{ user_id: userId, name: name.trim() }]);

    if (error) {
      alert('作成に失敗しました: ' + error.message);
      setLoading(false);
    } else {
      fetchDecks(); // 再取得して一覧を更新
    }
  };

  return { decks, loading, createDeck };
};