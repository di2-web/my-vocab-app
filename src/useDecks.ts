// src/useDecks.ts（全体）
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

    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("デッキ取得エラー:", error);
    } else {
      const toshinDeck: Deck = { id: 'toshin1800', name: '東進の英単語1800', is_default: true };
      const targetDeck: Deck = { id: 'target1900', name: 'ターゲットの友1900', is_default: true };
      setDecks([toshinDeck, targetDeck, ...(data || [])]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // 💡 非同期呼び出しにおけるESLintの誤検知を防ぐために、この行のみ警告をスキップします
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDecks();
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
      fetchDecks();
    }
  };

  const deleteDeck = async (deckId: string) => {
    if (!userId) return;
    if (!confirm('デッキを削除すると、登録されている単語もすべて削除されます。本当によろしいですか？')) return;
    setLoading(true);

    const { error } = await supabase
      .from('decks')
      .delete()
      .eq('id', deckId)
      .eq('user_id', userId);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
      setLoading(false);
    } else {
      fetchDecks();
    }
  };

  return { decks, loading, createDeck, deleteDeck };
};