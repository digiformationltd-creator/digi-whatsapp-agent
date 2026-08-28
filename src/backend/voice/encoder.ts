import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function getFfmpegPath(): string {
  const custom = process.env.FFMPEG_PATH;
  if (custom && fs.existsSync(custom)) return custom;
  return "ffmpeg";
}

/**
 * Converts audio buffer (WAV/MP3) to WhatsApp PTT compatible Opus OGG
 */
export async function convertToWhatsAppPtt(audioBuffer: Buffer): Promise<Buffer | null> {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `tts_in_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`);
  const outputPath = path.join(tempDir, `tts_out_${Date.now()}_${Math.random().toString(36).slice(2)}.ogg`);

  try {
    fs.writeFileSync(inputPath, audioBuffer);
    const ffmpeg = getFfmpegPath();

    // Convert to OGG Opus with WhatsApp compatible speech sample rate
    await execFileAsync(ffmpeg, [
      "-y",
      "-i", inputPath,
      "-c:a", "libopus",
      "-b:a", "32k",
      "-ar", "24000",
      "-ac", "1",
      "-vn",
      outputPath,
    ], { timeout: 15000 });

    if (fs.existsSync(outputPath)) {
      const oggBuffer = fs.readFileSync(outputPath);
      return oggBuffer;
    }
    return null;
  } catch (e: any) {
    console.error("[VoiceEncoder] ffmpeg PTT encoding error:", e?.message);
    // Return original audio buffer if ffmpeg is missing or failed
    return audioBuffer;
  } finally {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch { }
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch { }
  }
}
