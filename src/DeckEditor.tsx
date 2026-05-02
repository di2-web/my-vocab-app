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
        const importedList = JSON.parse(event.target?.result as string);
        await processAndSaveList(importedList);
        alert('JSONインポート完了！');
      } catch (err: any) {
        alert('読み込み失敗: ' + err.message);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // 🌟 3. AIマジック（自動生成）ロジック
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

      // Supabase Edge Functions を呼び出す
      const { data, error } = await supabase.functions.invoke('generate-cards', {
        body: { text: aiText, imageBase64 }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      await processAndSaveList(data);
      alert(`✨ AI生成完了！\n${data.length} 件の単語リストを作成・更新しました！`);

      setAiText('');
      setAiImageFile(null);
    } catch (err: any) {
      console.error(err);
      alert('AI生成エラー: ' + err.message);
    } finally {
      setIsAIGenerating(false);
    }
  };

  // （共通）取得したリストを差分更新でデータベースに保存する関数
  const processAndSaveList = async (list: any[]) => {
    if (!Array.isArray(list)) throw new Error('データ形式が間違っています');
    const updates: any[] = [];
    const inserts: any[] = [];

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
    <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '10px' }}>
      <button onClick={onBack} style={{ marginBottom: '20px', padding: '10px', cursor: 'pointer' }}>
        ← セット一覧に戻る
      </button>

      <h2 style={{ borderBottom: '2px solid #2196f3', paddingBottom: '10px' }}>✏️ 「{deck.name}」を編集</h2>

      {/* 🌟 魔法のAI生成セクション */}
      <div style={{ backgroundColor: '#fff8e1', padding: '20px', borderRadius: '10px', marginBottom: '30px', border: '1px solid #ffc107' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#ff8f00' }}>✨ AIで単語帳を自動生成！</h3>
        <p style={{ fontSize: '14px', marginBottom: '15px' }}>英語の長文を貼り付けるか、教科書の写真をアップロードすると、AIが重要な単語を抽出して単語帳を作ります。</p>

        <textarea
          placeholder="ここに英語の文章を貼り付ける（例：The quick brown fox jumps over the lazy dog...）"
          value={aiText} onChange={e => setAiText(e.target.value)}
          style={{ width: '100%', height: '80px', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
          <input
            type="file" accept="image/*"
            onChange={e => setAiImageFile(e.target.files?.[0] || null)}
          />
        </div>

        <button
          onClick={handleAIGenerate} disabled={isAIGenerating}
          style={{ width: '100%', padding: '15px', backgroundColor: isAIGenerating ? '#ccc' : '#ff9800', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: isAIGenerating ? 'not-allowed' : 'pointer' }}
        >
          {isAIGenerating ? '⏳ AIが一生懸命作っています... (10秒ほどお待ち下さい)' : '✨ AIにおまかせ生成！'}
        </button>
      </div>

      <hr style={{ border: '1px dashed #ccc', margin: '30px 0' }} />

      <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
        {/* 手動入力フォーム */}
        <form onSubmit={handleSave} style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ margin: 0 }}>{editingId ? '単語を編集' : '手動で1つ追加'}</h4>
          <input placeholder="英単語 (例: apple)" value={wordText} onChange={e => setWordText(e.target.value)} required style={{ padding: '8px' }} />
          <input placeholder="意味 (例: りんご)" value={meaning} onChange={e => setMeaning(e.target.value)} required style={{ padding: '8px' }} />
          <textarea placeholder="英語の例文" value={exampleEn} onChange={e => setExampleEn(e.target.value)} style={{ padding: '8px' }} />
          <textarea placeholder="例文の日本語訳" value={exampleJa} onChange={e => setExampleJa(e.target.value)} style={{ padding: '8px' }} />
          <input placeholder="不正解のダミー (カンマ区切り)" value={choicesStr} onChange={e => setChoicesStr(e.target.value)} style={{ padding: '8px' }} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ padding: '10px', flexGrow: 1, backgroundColor: '#2196f3', color: 'white', border: 'none', cursor: 'pointer' }}>{editingId ? '更新する' : '追加する'}</button>
            {editingId && <button type="button" onClick={resetForm} style={{ padding: '10px', backgroundColor: '#9e9e9e', color: 'white', border: 'none', cursor: 'pointer' }}>キャンセル</button>}
          </div>
        </form>

        {/* JSONインポートセクション */}
        <div style={{ backgroundColor: '#e8f5e9', padding: '15px', borderRadius: '10px' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>📁 既存のJSONファイルから追加</h4>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportJSON} />
        </div>
      </div>

      {/* 登録済み単語リスト */}
      <h3 style={{ marginTop: '40px' }}>登録済みの単語 ({words.length}件)</h3>
      {loading ? <p>読み込み中...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {words.map(w => (
            <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#fafafa' }}>
              <div>
                <strong style={{ fontSize: '18px', color: '#1976d2' }}>{w.word}</strong> <span style={{ color: '#555' }}>- {w.meaning}</span>
                {w.example_en && <div style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>例文: {w.example_en}</div>}
              </div>
              <div>
                <button onClick={() => handleEditClick(w)} style={{ marginRight: '10px', cursor: 'pointer', padding: '5px 10px' }}>✏️</button>
                <button onClick={() => handleDelete(w.id)} style={{ color: 'red', cursor: 'pointer', padding: '5px 10px' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}