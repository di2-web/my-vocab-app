// supabase/functions/generate-cards/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// セキュリティ設定（CORS: フロントエンドからの通信を許可）
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // ブラウザの事前確認リクエスト（OPTIONS）にOKを返す
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Reactから送られてきた画像(Base64)またはテキストを受け取る
    const { text, imageBase64 } = await req.json()
    
    // 金庫からAPIキーを取り出す
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('API Key is missing')

    // 🧠 Geminiへの「魔法のプロンプト」
    const prompt = `
      以下のテキストまたは画像から重要な英単語を抽出し、以下のJSON配列フォーマットで返してください。
      必ずJSONのみを出力し、バッククォート(\`\`\`json)やその他の説明は一切含めないでください。[
        {
          "word": "英単語",
          "meaning": "日本語の意味",
          "example_en": "英語の短い例文",
          "example_ja": "例文の日本語訳",
          "choices":["不正解のダミー選択肢1", "不正解のダミー選択肢2", "不正解のダミー選択肢3"]
        }
      ]
    `;

    // 画像がある場合と、テキストだけの場合で送り方を変える
    let contents: any[] =[];
    if (imageBase64) {
      contents = [{
        parts:[
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
        ]
      }];
    } else {
      contents = [{
        parts:[
          { text: prompt + "\n\n抽出対象テキスト:\n" + text }
        ]
      }];
    }

    // 最新のGemini API（gemini-1.5-flash / gemini-2.5-flash等、利用可能な最速モデル）を呼び出す
    // ※現在の安定版かつマルチモーダル(画像対応)で最速のモデル名を指定
    const model = 'gemini-flash-latest';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const resultText = data.candidates[0].content.parts[0].text;
    
    // AIが余計な文字（```json 等）を付けてきた場合に対処してパース
    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const cards = JSON.parse(cleanJson);

    // 成功したらReactへ単語データを返す！
    return new Response(JSON.stringify(cards), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("AI生成エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})