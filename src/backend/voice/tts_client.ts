import { VoiceSynthesisResult } from "./types";
import { convertToWhatsAppPtt } from "./encoder";

function getGroqKey(): string {
  return (process.env.GROQ_API_KEY || "").trim();
}

/**
 * Splits longer text into short sentences to respect Orpheus input length limits (§41)
 */
export function chunkTextForTTS(text: string, maxChunkLength = 200): string[] {
  if (!text) return [];
  if (text.length <= maxChunkLength) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if ((current + " " + trimmed).trim().length <= maxChunkLength) {
      current = (current + " " + trimmed).trim();
    } else {
      if (current) chunks.push(current);
      current = trimmed;
    }
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text.slice(0, maxChunkLength)];
}

/**
 * Synthesizes voice audio via Groq TTS endpoint
 */
export async function synthesizeVoice(
  text: string,
  language: "en" | "ar" = "en"
): Promise<VoiceSynthesisResult> {
  const groqKey = getGroqKey();
  if (!groqKey) {
    return { ok: false, error: "GROQ_API_KEY missing" };
  }

  const clean = text.trim();
  if (!clean) {
    return { ok: false, error: "Empty input text" };
  }

  // Model & Voice selection
  const model = language === "ar" ? "canopylabs/orpheus-arabic-saudi" : "canopylabs/orpheus-v1-english";
  const voice = language === "ar" ? "sulaiman" : "troy";

  const chunks = chunkTextForTTS(clean, 250);
  const targetText = chunks[0]; // Synthesize first primary chunk for WhatsApp audio

  try {
    const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: targetText,
        voice,
        response_format: "wav",
      }),
      signal: AbortSignal.timeout(12000), // 12-second timeout guard
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[GroqTTS] TTS synthesis returned ${response.status}:`, errText.slice(0, 150));
      return { ok: false, error: `Groq TTS error (${response.status}): ${errText}` };
    }

    const rawArrayBuffer = await response.arrayBuffer();
    const rawBuffer = Buffer.from(rawArrayBuffer);

    // Convert to WhatsApp PTT Opus Ogg
    const pttBuffer = await convertToWhatsAppPtt(rawBuffer);

    return {
      ok: true,
      audioBuffer: pttBuffer || rawBuffer,
      mimeType: "audio/ogg; codecs=opus",
    };
  } catch (e: any) {
    console.error("[GroqTTS] Synthesis failed:", e?.message);
    return { ok: false, error: e?.message || "Synthesis timeout or network error" };
  }
}
