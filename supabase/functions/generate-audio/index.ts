// supabase/functions/generate-audio/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode, decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 💡 魔法の関数：Geminiが返してくる「生データ(PCM)」を「WAVファイル」に変換する
function wrapPcmToWav(pcmData: Uint8Array, sampleRate = 24000, channels = 1, bitsPerSample = 16): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true);
  view.setUint16(32, channels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, pcmData.length, true);

  const wavBytes = new Uint8Array(44 + pcmData.length);
  wavBytes.set(new Uint8Array(header), 0);
  wavBytes.set(pcmData, 44);
  return wavBytes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey || !text) throw new Error('必要なデータがありません');

    // 💡 Gemini TTSモデルに対する「超・厳格な演技指導」
    const prompt = `
    ### DIRECTOR'S NOTES
    Style: Dictionary pronunciation guide. Extremely clear, flat, and professional. No emotion, no breathiness, no dramatic pauses.
    Pace: Steady, even, and consistent pace.

    ### TRANSCRIPT
    ${text}
    `;

    // 🚀 最新の Gemini 3.1 Flash TTS Preview API を呼び出す
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts:[{ text: prompt }]
        }],
        generationConfig: {
          responseModalities:["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                // 💡 息遣いが少なく、はっきり発音する「Iapetus (Clear)」に変更
                voiceName: "Iapetus" 
              }
            }
          }
        }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    // APIからBase64の生データ（PCM）を取得
    const pcmBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!pcmBase64) throw new Error('音声データの取得に失敗しました');

    // PCMをバイナリに変換し、WAVヘッダーをくっつけてブラウザで再生可能にする
    const pcmBytes = decode(pcmBase64);
    const wavBytes = wrapPcmToWav(pcmBytes);
    const wavBase64 = encode(wavBytes); // 再びBase64にしてReactへ送る

    return new Response(JSON.stringify({ audioBase64: wavBase64 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("音声生成エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});