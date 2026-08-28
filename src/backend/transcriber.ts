import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

let localPipeline: any = null;
let pipelineLoading: Promise<any> | null = null;

function getFfmpegPath(): string {
  const custom = process.env.FFMPEG_PATH;
  if (custom && fs.existsSync(custom)) return custom;
  return "ffmpeg";
}

export async function convertToWav16k(audioBuffer: Buffer): Promise<Buffer | null> {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `wa_in_${Date.now()}_${Math.random().toString(36).slice(2)}.ogg`);
  const outputPath = path.join(tempDir, `wa_out_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`);

  try {
    fs.writeFileSync(inputPath, audioBuffer);
    const ffmpeg = getFfmpegPath();
    await execFileAsync(ffmpeg, [
      "-y",
      "-i", inputPath,
      "-ar", "16000",
      "-ac", "1",
      "-c:a", "pcm_s16le",
      outputPath,
    ], { timeout: 15000 });

    if (fs.existsSync(outputPath)) {
      const wavBuffer = fs.readFileSync(outputPath);
      return wavBuffer;
    }
    return null;
  } catch (e: any) {
    console.error("[Transcriber] ffmpeg audio conversion error:", e?.message);
    return null;
  } finally {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch { }
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch { }
  }
}

async function transcribeWithOfficialOpenAIWhisper(wavBuffer: Buffer): Promise<string> {
  const tempDir = os.tmpdir();
  const tempWav = path.join(tempDir, `wa_whisper_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`);
  const scriptPath = path.join(process.cwd(), "scripts", "whisper_transcribe.py");

  try {
    fs.writeFileSync(tempWav, wavBuffer);
    const pythonExe = process.env.PYTHON_PATH || "python";

    const { stdout } = await execFileAsync(pythonExe, [scriptPath, tempWav], {
      timeout: 60000,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    try {
      const data = JSON.parse(stdout.trim());
      if (data.ok && data.text) {
        console.log(`[Transcriber] Official OpenAI Whisper transcribed (${data.language}):`, data.text);
        return String(data.text).trim();
      }
    } catch {
      if (stdout.trim()) {
        return stdout.trim();
      }
    }
    return "";
  } catch (e: any) {
    console.error("[Transcriber] Official OpenAI Whisper process note:", e?.message);
    return "";
  } finally {
    try { if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav); } catch { }
  }
}

async function transcribeWithLocalWhisper(wavBuffer: Buffer): Promise<string> {
  try {
    // @ts-ignore
    const { pipeline } = await import("@xenova/transformers");
    // @ts-ignore
    const wavefile = (await import("wavefile")).default;

    if (!localPipeline) {
      if (!pipelineLoading) {
        console.log("[Transcriber] Loading local open-source Whisper model (Xenova/whisper-tiny)...");
        pipelineLoading = pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
          quantized: true,
        });
      }
      localPipeline = await pipelineLoading;
      console.log("[Transcriber] Local Whisper model loaded successfully.");
    }

    const wav = new wavefile.WaveFile(wavBuffer);
    wav.toBitDepth("32f");
    wav.toSampleRate(16000);
    let audioData = wav.getSamples();
    if (Array.isArray(audioData)) {
      audioData = audioData[0];
    }

    const result = await localPipeline(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    return String(result?.text || "").trim();
  } catch (e: any) {
    console.error("[Transcriber] Local Whisper error:", e?.message);
    return "";
  }
}

function getActiveGroqKey(): string {
  let k = (process.env.GROQ_API_KEY || "").trim();
  if (!k) {
    try {
      const envPath = path.join(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const txt = fs.readFileSync(envPath, "utf-8");
        const match = txt.match(/^GROQ_API_KEY=(.*)$/m);
        if (match && match[1]) {
          k = match[1].trim().replace(/^["']|["']$/g, "");
          if (k) process.env.GROQ_API_KEY = k;
        }
      }
    } catch { }
  }
  return k;
}

async function queryGroqWhisper(buffer: Buffer, filename: string, mime: string, groqKey: string): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: mime }), filename);
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("response_format", "json");
    formData.append("prompt", "Digiformation Ltd, UK company formation, LTD registration, packages, Starter, Silver, Gold, Platinum, pricing, address, banking, Roman Urdu.");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}` },
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    if (res.ok) {
      const data: any = await res.json();
      const text = String(data?.text || "").trim();
      if (text) {
        console.log(`[Transcriber] Groq Whisper (${filename}) success:`, text);
        return text;
      }
    } else {
      const err = await res.text();
      console.error(`[Transcriber] Groq (${filename}) returned status ${res.status}:`, err);
    }
  } catch (e: any) {
    console.error(`[Transcriber] Groq (${filename}) request error:`, e?.message);
  }
  return "";
}

export async function transcribeAudioMessage(rawBuffer: Buffer, mimeType = "audio/ogg"): Promise<string> {
  if (!rawBuffer || rawBuffer.length === 0) return "";

  const groqKey = getActiveGroqKey();

  // 1) First attempt Groq Whisper with clean WAV conversion (most reliable audio format)
  const wavBuffer = await convertToWav16k(rawBuffer);
  if (groqKey && wavBuffer) {
    const wavText = await queryGroqWhisper(wavBuffer, "voice.wav", "audio/wav", groqKey);
    if (wavText) return wavText;
  }

  // 2) If WAV attempt didn't produce text, attempt Groq Whisper with raw OGG/Opus buffer
  if (groqKey) {
    const ext = mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a"
      : mimeType.includes("mpeg") || mimeType.includes("mp3") ? "mp3"
      : mimeType.includes("wav") ? "wav" : "ogg";
    const rawText = await queryGroqWhisper(rawBuffer, `voice.${ext}`, mimeType, groqKey);
    if (rawText) return rawText;
  }

  // 3) Fallback: Official OpenAI Whisper (Local Python)
  const effectiveWav = wavBuffer || rawBuffer;
  const officialWhisperText = await transcribeWithOfficialOpenAIWhisper(effectiveWav);
  if (officialWhisperText) return officialWhisperText;

  // 4) Fallback: Local Transformers.js Whisper
  return await transcribeWithLocalWhisper(effectiveWav);
}
