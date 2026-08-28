export interface VoiceEligibilityResult {
  eligible: boolean;
  reason?: string;
  language: string;
  isTextOnlyRequired: boolean;
}

export interface VoiceSynthesisResult {
  ok: boolean;
  audioBuffer?: Buffer;
  mimeType?: string;
  durationSeconds?: number;
  error?: string;
}
