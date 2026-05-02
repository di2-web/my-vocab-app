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
    setLoading(true);

    // Supabaseから自分のデッキを取得
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("デッキ取得エラー:", error);
    } else {
      // 公式セット（デフォルト）を先頭に追加してセット
      const defaultDeck: Deck = { id: 'default', name: '⭐️ 公式単語セット', is_default: true };
      setDecks([defaultDeck, ...(data || [])]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const createDeck = async (name: string) => {
    if (!userId || !name.trim()) return;
    const { error } = await supabase
      .from('decks')
      .insert([{ user_id: userId, name: name.trim() }]);

    if (error) {
      alert('作成に失敗しました: ' + error.message);
    } else {
      fetchDecks(); // 再取得して一覧を更新
    }
  };

  return { decks, loading, createDeck };
};