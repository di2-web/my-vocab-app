// src/DeckEditor.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';
import type { Deck } from './useDecks';

type WordRow = {
  id: string;
  deck_id: string;
  word: string;
  meaning: string;
  example_en: string;
  example_ja: string;
  choices: string[];
};

type Props = {
  deck: Deck;
  onBack: () => void;
};

export default function DeckEditor({ deck, onBack }: Props) {
  const [words, setWords] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);

  // --- 手動フォーム用 ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wordText, setWordText] = useState('');
  const [meaning, setMeaning] = useState('');
  const [exampleEn, setExampleEn] = useState('');
  const [exampleJa, setExampleJa] = useState('');
  const [choicesStr, setChoicesStr] = useState('');

  // --- AI自動生成用 ---
  const [aiText, setAiText] = useState('');
  const [aiImageFile, setAiImageFile] = useState<File | null>(null);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('deck_id', deck.id)
      .order('created_at', { ascending: false });

    if (!error && data) setWords(data);
    setLoading(false);
  }, [deck.id]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // 1. 手動で保存
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const choices = choicesStr.split(',').map(s => s.trim()).filter(s => s);
    const payload = { deck_id: deck.id, word: wordText, meaning, example_en: exampleEn, example_ja: exampleJa, choices };

    if (editingId) {
      await supabase.from('words').update(payload).eq('id', editingId);
    } else {
      await supabase.from('words').insert([payload]);
    }
    resetForm();
    fetchWords();
  };

  const resetForm = () => {
    setEditingId(null);
    setWordText(''); setMeaning(''); setExampleEn(''); setExampleJa(''); setChoicesStr('');
  };

  const handleEditClick = (w: WordRow) => {
    setEditingId(w.id); setWordText(w.word); setMeaning(w.meaning);
    setExampleEn(w.example_en || ''); setExampleJa(w.example_ja || ''); setChoicesStr((w.choices || []).join(', '));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return;
    await supabase.from('words').delete().eq('id', id);
    fetchWords();
  };

  // 2. JSONインポート
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedList = JSON.parse(event.target?.result as string) as Array<{ word: string; meaning?: string; example_en?: string; example_ja?: string; choices?: string[] }>;
        await processAndSaveList(importedList);
        alert('JSONインポート完了！');
      } catch (err: unknown) {
        alert('読み込み失敗: ' + (err instanceof Error ? err.message : String(err)));
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // 3. AI自動生成
  const handleAIGenerate = async () => {
    if (!aiText.trim() && !aiImageFile) {
      alert('英語の長文を入力するか、画像を選択してください！');
      return;
    }
    setIsAIGenerating(true);

    try {
      let imageBase64 = null;
      if (aiImageFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
        });
        reader.readAsDataURL(aiImageFile);
        imageBase64 = await base64Promise;
      }

      const { data, error } = await supabase.functions.invoke('generate-cards', {
        body: { text: aiText, imageBase64 }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      await processAndSaveList(data);
      alert(`AI生成完了！\n${data.length} 件の単語リストを作成・更新しました！`);

      setAiText('');
      setAiImageFile(null);
    } catch (err: unknown) {
      console.error(err);
      alert('AI生成エラー: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsAIGenerating(false);
    }
  };

  const processAndSaveList = async (list: Array<{ word: string; meaning?: string; example_en?: string; example_ja?: string; choices?: string[] }>) => {
    if (!Array.isArray(list)) throw new Error('データ形式が間違っています');
    const updates: Array<Partial<WordRow> & { id: string }> = [];
    const inserts: Array<Omit<WordRow, 'id'>> = [];

    list.forEach(item => {
      const existing = words.find(w => w.word.toLowerCase() === item.word.toLowerCase());
      const payload = {
        deck_id: deck.id, word: item.word, meaning: item.meaning || '',
        example_en: item.example_en || '', example_ja: item.example_ja || '', choices: item.choices || []
      };
      if (existing) updates.push({ id: existing.id, ...payload });
      else inserts.push(payload);
    });

    if (updates.length > 0) await supabase.from('words').upsert(updates);
    if (inserts.length > 0) await supabase.from('words').insert(inserts);
    fetchWords();
  };

  return (
    <div className="container" style={{ padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={onBack}>戻る</button>
      </div>

      <h1 style={{ fontSize: '28px', marginBottom: '25px', color: 'var(--text-h)' }}>「{deck.name}」の編集</h1>

      {/* 🌟 AI自動生成セクション */}
      <div style={{ backgroundColor: 'var(--code-bg)', padding: '24px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--border)', textAlign: 'left' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: 'var(--text-h)', fontWeight: 'bold' }}>AIで自動生成</h3>
        <p style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text)', lineHeight: '1.5' }}>
          英語の長文を貼り付けるか、テキスト画像のファイルをアップロードすると、AIが重要な単語を自動で抽出してカードを作成します。
        </p>

        <textarea
          placeholder="英語の文章をここにペーストしてください..."
          value={aiText} onChange={e => setAiText(e.target.value)}
          style={{ width: '100%', height: '100px', padding: '12px', marginBottom: '16px', boxSizing: 'border-box' }}
        />

        <div style={{ marginBottom: '16px' }}>
          <input
            type="file" accept="image/*"
            onChange={e => setAiImageFile(e.target.files?.[0] || null)}
          />
        </div>

        <button
          onClick={handleAIGenerate} disabled={isAIGenerating}
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '15px' }}
        >
          {isAIGenerating ? 'AIが生成中です (10秒ほどお待ち下さい)...' : 'AIに自動生成をまかせる'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
        {/* 手動入力フォーム */}
        <form onSubmit={handleSave} style={{ backgroundColor: 'var(--code-bg)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: 'var(--text-h)', fontWeight: 'bold' }}>
            {editingId ? '単語を編集' : '単語を手動で追加'}
          </h3>
          <input placeholder="英単語 (必須 例: apple)" value={wordText} onChange={e => setWordText(e.target.value)} required />
          <input placeholder="意味 (必須 例: りんご)" value={meaning} onChange={e => setMeaning(e.target.value)} required />
          <textarea placeholder="英語の例文 (任意)" value={exampleEn} onChange={e => setExampleEn(e.target.value)} style={{ height: '60px' }} />
          <textarea placeholder="例文の日本語訳 (任意)" value={exampleJa} onChange={e => setExampleJa(e.target.value)} style={{ height: '60px' }} />
          <input placeholder="不正解のダミー選択肢 (任意、カンマ区切り)" value={choicesStr} onChange={e => setChoicesStr(e.target.value)} />

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
              {editingId ? '更新する' : '追加する'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                キャンセル
              </button>
            )}
          </div>
        </form>

        {/* JSONインポートセクション */}
        <div style={{ backgroundColor: 'var(--code-bg)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'left' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: 'var(--text-h)', fontWeight: 'bold' }}>JSONファイルからインポート</h3>
          <p style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text)', lineHeight: '1.5' }}>
            作成済みのバックアップファイル（.json）を読み込んで追加します。
          </p>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportJSON} />
        </div>
      </div>

      {/* 登録済み単語リスト */}
      <h3 style={{ marginTop: '40px', marginBottom: '16px', textAlign: 'left', color: 'var(--text-h)', fontSize: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        登録済みの単語 ({words.length}件)
      </h3>

      {loading ? (
        <p style={{ color: 'var(--text)' }}>読み込み中...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {words.map(w => (
            <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--code-bg)', textAlign: 'left' }}>
              <div>
                <strong style={{ fontSize: '16px', color: 'var(--accent)' }}>{w.word}</strong>
                <span style={{ color: 'var(--text-h)', marginLeft: '8px' }}>- {w.meaning}</span>
                {w.example_en && (
                  <div style={{ fontSize: '12px', marginTop: '6px', color: 'var(--text)' }}>
                    例文: {w.example_en}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleEditClick(w)}>
                  編集
                </button>
                <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDelete(w.id)}>
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}