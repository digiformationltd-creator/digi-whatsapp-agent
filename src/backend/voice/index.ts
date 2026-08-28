export * from "./types";
export * from "./eligibility";
export * from "./tts_client";
export * from "./encoder";

import { evaluateVoiceEligibility } from "./eligibility";
import { synthesizeVoice } from "./tts_client";

/**
 * Executes the complete Voice Reply Layer pipeline (§41):
 * 1. Checks deterministic eligibility
 * 2. If eligible, synthesizes audio via Groq TTS
 * 3. Returns audio buffer (PTT) if successful, or signals text fallback
 */
export async function processVoiceReply(
  isVoiceInbound: boolean,
  replyText: string
): Promise<{ shouldSendVoice: boolean; audioBuffer?: Buffer; mimeType?: string }> {
  // 1. Eligibility Check
  const eligibility = evaluateVoiceEligibility(isVoiceInbound, replyText);
  if (!eligibility.eligible) {
    return { shouldSendVoice: false };
  }

  // 2. Synthesize Audio
  const synth = await synthesizeVoice(replyText, eligibility.language as "en" | "ar");
  if (synth.ok && synth.audioBuffer) {
    return {
      shouldSendVoice: true,
      audioBuffer: synth.audioBuffer,
      mimeType: synth.mimeType || "audio/ogg; codecs=opus",
    };
  }

  // 3. Fallback to text
  return { shouldSendVoice: false };
}
