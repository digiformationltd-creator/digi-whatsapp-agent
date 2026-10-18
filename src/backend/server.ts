// ── crash protection for Baileys & socket drops ──────────────────────────────
process.on("unhandledRejection", (reason: any) => {
  console.warn("[Server Shield] Handled unhandledRejection:", reason?.message || reason);
});
process.on("uncaughtException", (error: any) => {
  console.warn("[Server Shield] Handled uncaughtException:", error?.message || error);
});

/**
 * Standalone WhatsApp Agent server.
 */

import fs from "fs";
import path from "path";
import http from "http";
import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const currentDir = typeof __dirname !== "undefined"
  ? __dirname
  : (typeof import.meta !== "undefined" && import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd());

import {
  whatsappConnect,
  whatsappDisconnect,
  whatsappSend,
  whatsappList,
  getWhatsappKnowledge,
  setWhatsappKnowledge,
  getWhatsappAgentActive,
  setWhatsappAgentActive,
  getWhatsappBlocklist,
  setWhatsappBlocklist,
  getWhatsappMode,
  setWhatsappMode,
  registerChannelRoutes,
  setChannelRouter,
  channelStatus,
  whatsappHasSession,
  isGroupJid,
} from "./channels";
import {
  waChatMemoryTop,
  waChatHistory,
  waChatRow,
} from "./memory/wa_memory";
import {
  waCrmSummary,
  waCrmListContacts,
  waCrmUpdateDealStatus,
  waCrmGetLeadSources,
} from "./crm/wa_crm";
import { scanFollowups, scanFollowupsDeep } from "./scheduler/followup_engine";
import { parseAndNormalizeKnowledge, SUPPORTED_EXTENSIONS } from "./knowledge_parser";
import { emit as emitLive, attachSink, registerEventRoutes } from "../shared/live_events";

// ── environment ──────────────────────────────────────────────────────────────
dotenv.config();
if (process.env.APPDATA) {
  const appDataEnv = path.join(process.env.APPDATA, "digi-whatsapp-agent", ".env");
  if (fs.existsSync(appDataEnv)) {
    dotenv.config({ path: appDataEnv, override: true });
  }
}
if (process.env.MYRAA_DATA_DIR) {
  const dirEnv = path.join(path.dirname(process.env.MYRAA_DATA_DIR), ".env");
  if (fs.existsSync(dirEnv)) {
    dotenv.config({ path: dirEnv, override: true });
  }
}

function persistEnvVar(keyName: string, val: string): void {
  process.env[keyName] = val;
  const paths = [
    path.join(process.cwd(), ".env"),
    process.env.MYRAA_DATA_DIR ? path.join(path.dirname(process.env.MYRAA_DATA_DIR), ".env") : null,
    process.env.APPDATA ? path.join(process.env.APPDATA, "Digi WhatsApp Agent", ".env") : null,
    process.env.APPDATA ? path.join(process.env.APPDATA, "digi-whatsapp-agent", ".env") : null,
  ].filter(Boolean) as string[];

  for (const envPath of paths) {
    try {
      let txt = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
      const re = new RegExp(`^${keyName}=.*$`, "m");
      if (re.test(txt)) txt = txt.replace(re, `${keyName}=${val}`);
      else txt += `\n${keyName}=${val}\n`;
      fs.writeFileSync(envPath, txt);
    } catch { }
  }
}

const PORT = Number(process.env.PORT || 9010);

// Resolve the data dir relative to this project unless overridden.
if (!process.env.MYRAA_DATA_DIR && !process.env.DIGI_DATA_DIR) {
  try {
    const cwdData = path.join(process.cwd(), "data");
    fs.mkdirSync(cwdData, { recursive: true });
    process.env.MYRAA_DATA_DIR = cwdData;
  } catch {
    // Fallback if process.cwd() is read-only (e.g. C:\Program Files)
    const homeData = path.join(process.env.APPDATA || process.env.HOME || ".", ".whatsapp-agent", "data");
    fs.mkdirSync(homeData, { recursive: true });
    process.env.MYRAA_DATA_DIR = homeData;
  }
}
if (process.env.MYRAA_DATA_DIR) {
  fs.mkdirSync(process.env.MYRAA_DATA_DIR, { recursive: true });
}

// ── app ──────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── AI router (the "brain" of the agent) ─────────────────────────────────────
//
// The original app routed channel messages to a separate Python "brain"
// service. In the standalone agent the same interface is preserved but the
// default implementation calls the free chat stack directly:
//   1. WHATSAPP_AGENT_KEY (OpenCode Zen / any OpenAI-compatible endpoint)
//   2. GROQ_API_KEY (free tier)
// A custom router can still be injected via setChannelRouter() by embedding
// hosts that run their own reasoning engine.

async function defaultBrainRouter(text: string, source: string): Promise<{ ok: boolean; text: string }> {
  // HARD RULE: Permanently block any group replies at the router level
  if (isGroupJid(source)) {
    return { ok: false, text: "BLOCKED: Never reply to WhatsApp groups." };
  }

  const clean = (text || "").trim();
  if (!clean) return { ok: false, text: "empty message" };

  let zenKey = (process.env.WHATSAPP_AGENT_KEY || "").trim();
  let groqKey = (process.env.GROQ_API_KEY || "").trim();
  if (!zenKey || !groqKey) {
    try {
      const envPath = path.join(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const envTxt = fs.readFileSync(envPath, "utf-8");
        const zm = envTxt.match(/^WHATSAPP_AGENT_KEY=(.*)$/m);
        if (zm && zm[1] && !zenKey) zenKey = zm[1].trim().replace(/^["']|["']$/g, "");
        const gm = envTxt.match(/^GROQ_API_KEY=(.*)$/m);
        if (gm && gm[1] && !groqKey) groqKey = gm[1].trim().replace(/^["']|["']$/g, "");
      }
    } catch { }
  }

  const base = (process.env.WHATSAPP_AGENT_BASE_URL || "https://opencode.ai/zen/v1").replace(/\/$/, "");
  const FREE_MODELS = [
    "nemotron-3-ultra-free", "big-pickle", "mimo-v2.5-free", "hy3-free",
    "nemotron-3.5-lightning-free", "laguna-s-2.1-free", "deepseek-v4-flash-free",
  ];
  const envModel = (process.env.WHATSAPP_AGENT_MODEL || "").trim();
  const candidates = envModel ? [envModel, ...FREE_MODELS] : FREE_MODELS;
  for (const model of candidates) {
    try {
      const r = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: zenKey ? { "Content-Type": "application/json", Authorization: `Bearer ${zenKey}` } : { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: clean }] }),
        signal: AbortSignal.timeout(45000),
      });
      if (!r.ok) continue;
      const d: any = await r.json();
      if (d?.error || d?.type === "error") continue;
      const reply = String(d?.choices?.[0]?.message?.content || d?.choices?.[0]?.text || "").trim();
      if (reply) {
        console.log(`[Brain] OpenCode Zen (${model}) generated response`);
        return { ok: true, text: reply };
      }
    } catch { /* try next model */ }
  }

  // 2) Groq free tier.
  if (groqKey) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
          messages: [{ role: "user", content: clean }],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (r.ok) {
        const d: any = await r.json();
        const reply = String(d?.choices?.[0]?.message?.content || "").trim();
        if (reply) {
          console.log(`[Brain] Groq (${process.env.GROQ_MODEL || "qwen/qwen3.8-27b"}) generated response`);
          return { ok: true, text: reply };
        }
      }
    } catch { /* fall through */ }
  }

  // 3) Cloudflare Workers AI
  const cfAccountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const cfToken = (process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY || "").trim();
  if (cfAccountId && cfToken) {
    const cfModel = (process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.3-70b-instruct").trim();
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${cfModel}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfToken}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: clean }],
          max_tokens: 450,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) {
        const d: any = await r.json();
        const reply = String(d?.result?.response || d?.result || "").trim();
        if (reply) {
          console.log(`[Brain] Cloudflare Workers AI (${cfModel}) generated response`);
          return { ok: true, text: reply };
        }
      }
    } catch { /* fall through */ }
  }

  // 4) Mistral AI (Free Experiment Tier - 1B Tokens/month)
  const mistralKey = (process.env.MISTRAL_API_KEY || "").trim();
  if (mistralKey) {
    const mistralModel = (process.env.MISTRAL_MODEL || "mistral-small-latest").trim();
    try {
      const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mistralKey}`,
        },
        body: JSON.stringify({
          model: mistralModel,
          messages: [{ role: "user", content: clean }],
          max_tokens: 450,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) {
        const d: any = await r.json();
        const reply = String(d?.choices?.[0]?.message?.content || "").trim();
        if (reply) {
          console.log(`[Brain] Mistral AI (${mistralModel}) generated response`);
          return { ok: true, text: reply };
        }
      }
    } catch { /* fall through */ }
  }

  // 5) GitHub Models (100% Free via GitHub Personal Access Token)
  const ghToken = (process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_TOKEN || "").trim();
  if (ghToken) {
    const ghModel = (process.env.GITHUB_MODEL || "gpt-4o-mini").trim();
    try {
      const r = await fetch("https://models.inference.ai.azure.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ghToken}`,
        },
        body: JSON.stringify({
          model: ghModel,
          messages: [{ role: "user", content: clean }],
          max_tokens: 450,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) {
        const d: any = await r.json();
        const reply = String(d?.choices?.[0]?.message?.content || "").trim();
        if (reply) {
          console.log(`[Brain] GitHub Models (${ghModel}) generated response`);
          return { ok: true, text: reply };
        }
      }
    } catch { /* fall through */ }
  }

  // 6) SambaNova Cloud (100% Free Ultra-Fast Developer Tier ~400 T/s)
  const sambanovaKey = (process.env.SAMBANOVA_API_KEY || "").trim();
  if (sambanovaKey) {
    const sambanovaModel = (process.env.SAMBANOVA_MODEL || "Meta-Llama-3.1-70B-Instruct").trim();
    try {
      const r = await fetch("https://api.sambanova.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sambanovaKey}`,
        },
        body: JSON.stringify({
          model: sambanovaModel,
          messages: [{ role: "user", content: clean }],
          max_tokens: 450,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) {
        const d: any = await r.json();
        const reply = String(d?.choices?.[0]?.message?.content || "").trim();
        if (reply) {
          console.log(`[Brain] SambaNova Cloud (${sambanovaModel}) generated response`);
          return { ok: true, text: reply };
        }
      }
    } catch { /* fall through */ }
  }

  // 7) Together AI (Fast Open Source Free Models)
  const togetherKey = (process.env.TOGETHER_API_KEY || "").trim();
  if (togetherKey) {
    const togetherModel = (process.env.TOGETHER_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo").trim();
    try {
      const r = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${togetherKey}`,
        },
        body: JSON.stringify({
          model: togetherModel,
          messages: [{ role: "user", content: clean }],
          max_tokens: 450,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) {
        const d: any = await r.json();
        const reply = String(d?.choices?.[0]?.message?.content || "").trim();
        if (reply) {
          console.log(`[Brain] Together AI (${togetherModel}) generated response`);
          return { ok: true, text: reply };
        }
      }
    } catch { /* fall through */ }
  }

  emitLive("warning", { message: `No AI provider configured (${source})`, detail: "Configure Gemini, Groq, Cloudflare, Mistral, GitHub Models, SambaNova, or Together AI in Settings" });
  return { ok: false, text: "(no reply)" };
}

setChannelRouter(defaultBrainRouter);

// ── Health Check (for Electron splash & status monitoring) ───────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "digi-whatsapp-agent",
    version: "1.0.0",
    port: PORT,
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// ── WhatsApp API routes (faithful to the original server.ts) ────────────────

// Status of one WhatsApp account (?id=0|1|2, default 0).
app.get("/api/whatsapp/status", (req, res) => {
  const id = String(req.query?.id ?? "0");
  const s = channelStatus(id === "0" ? "whatsapp" : `whatsapp:${id}`);
  const state = s?.state || "disconnected";
  const hasSession = whatsappHasSession(id);
  const isConnected = state === "connected";
  res.json({
    ok: true,
    id,
    connected: isConnected,
    state: state,
    status: state,
    hasSession,
    phone: (s as any)?.account || null,
    qr: isConnected ? null : (s?.qr || null),
    agentActive: getWhatsappAgentActive(id),
    message: s?.detail || (isConnected ? "Linked and online" : "WhatsApp not linked yet. Tap Connect to show a pairing QR."),
  });
});

// Top recent chats for the connected WhatsApp mobile
app.get("/api/whatsapp/chats", (_req, res) => {
  try {
    const limit = Number(_req.query?.limit || 50);
    const chats = waChatMemoryTop(limit);
    res.json({ ok: true, chats });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to load chats." });
  }
});

// Stored message history of one chat (client inbound & AI outbound)
app.get("/api/whatsapp/chat/messages", (req, res) => {
  try {
    const jid = String(req.query?.jid || "");
    if (!jid) return res.status(400).json({ ok: false, error: "jid is required" });
    const limit = Number(req.query?.limit || 80);
    const messages = waChatHistory(jid, limit);
    const chat = waChatRow(jid);
    res.json({ ok: true, jid, chat, messages });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to load chat history." });
  }
});

// Auto-reply switch for one WhatsApp account.
app.get("/api/whatsapp/agent", (req, res) => {
  const id = String(req.query?.id ?? "0");
  res.json({ ok: true, id, active: getWhatsappAgentActive(id) });
});
app.post("/api/whatsapp/agent", (req, res) => {
  try {
    const id = String(req.body?.id ?? "0");
    const active = Boolean(req.body?.active);
    setWhatsappAgentActive(active, id);
    emitLive("channel_message", { message: `WhatsApp[${id}] agent ${active ? "ON" : "OFF"}` });
    res.json({ ok: true, id, active });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to set agent state." });
  }
});

// WhatsApp account — single dedicated slot.
app.get("/api/whatsapp/list", (_req, res) => {
  try { res.json({ ok: true, max: 1, accounts: whatsappList() }); }
  catch (e: any) { res.status(500).json({ ok: false, error: e?.message || "Failed to list accounts." }); }
});

// Start (or restart) pairing for one account ({id}). Returns immediately; the
// QR then appears via /api/whatsapp/status?id=… as state becomes "qr_ready".
app.post("/api/whatsapp/connect", async (req, res) => {
  try {
    const status = await whatsappConnect(String(req.body?.id ?? "0"));
    res.json({ ok: true, status });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to start WhatsApp pairing." });
  }
});

// Unlink / stop one account. Pass {wipe:true} to also clear its creds.
app.post("/api/whatsapp/disconnect", async (req, res) => {
  try {
    const status = await whatsappDisconnect(String(req.body?.id ?? "0"), Boolean(req.body?.wipe));
    res.json({ ok: true, status });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to disconnect WhatsApp." });
  }
});

// Multi-format parsing and validation endpoint for Knowledge Base (MD, TXT, JSON, YAML, YML, CSV)
app.post("/api/whatsapp/knowledge/parse", (req, res) => {
  try {
    const { text, filename, format } = req.body || {};
    const result = parseAndNormalizeKnowledge(String(text ?? ""), String(filename || format || "md"));
    if (!result.ok) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to parse document." });
  }
});

// Sales-agent Business Knowledge Base for the WhatsApp bot.
// Supports .md, .txt, .json, .yaml, .yml, .csv formats with automatic validation and normalization.
app.get("/api/whatsapp/knowledge", (req, res) => {
  res.json({ ok: true, id: String(req.query?.id ?? "0"), text: getWhatsappKnowledge(String(req.query?.id ?? "0")) });
});

app.post("/api/whatsapp/knowledge", (req, res) => {
  try {
    const raw = String(req.body?.text ?? "");
    const id = String(req.body?.id ?? "0");
    const filenameOrFormat = String(req.body?.filename || req.body?.format || "md");

    const parsed = parseAndNormalizeKnowledge(raw, filenameOrFormat);
    if (!parsed.ok) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }

    setWhatsappKnowledge(parsed.normalizedText || raw, id);
    emitLive("file_action", {
      message: `Business Knowledge Base updated (Account ${id}, format: ${parsed.format?.toUpperCase() || "MD"})`,
    });

    res.json({
      ok: true,
      saved: true,
      format: parsed.format,
      length: (parsed.normalizedText || raw).length,
      details: parsed.details,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to save knowledge base." });
  }
});

// Manual send (kept from the original /api/channels/whatsapp/send).
app.post("/api/whatsapp/send", async (req, res) => {
  const { to, text, id } = req.body || {};
  if (!to || !text) return res.status(400).json({ ok: false, error: "`to` and `text` are required" });
  if (isGroupJid(String(to))) {
    return res.status(403).json({ ok: false, error: "BLOCKED_GROUP_REPLY: Hard rule permanently prevents sending messages to WhatsApp groups." });
  }
  const out = await whatsappSend(String(to), String(text), String(id ?? "0"));
  res.status(out.ok ? 200 : 409).json(out);
});

// Agent AI key (OpenCode Zen) — managed from the UI Settings panel.
// Saved to the runtime env immediately and persisted to .env so it survives restarts.
app.get("/api/config/agent-key", (_req, res) => {
  const k = (process.env.WHATSAPP_AGENT_KEY || "").trim();
  res.json({ ok: true, set: Boolean(k), hint: k ? `sk-…${k.slice(-4)}` : "" });
});

app.post("/api/config/agent-key", (req, res) => {
  const key = String(req.body?.key || "").trim();
  try {
    persistEnvVar("WHATSAPP_AGENT_KEY", key);
    emitLive("config", { message: key ? "Agent AI key saved" : "Agent AI key cleared" });
    res.json({ ok: true, set: Boolean(key) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to save key." });
  }
});

// Groq Whisper Voice Transcription Key & Fast LPU LLM
app.get("/api/config/groq-key", (_req, res) => {
  const k = (process.env.GROQ_API_KEY || "").trim();
  const model = (process.env.GROQ_MODEL || "qwen/qwen3.8-27b").trim();
  res.json({ ok: true, set: Boolean(k), hint: k ? `gsk_…${k.slice(-4)}` : "", model });
});

app.post("/api/config/groq-key", (req, res) => {
  const key = String(req.body?.key || "").trim();
  const model = String(req.body?.model || "qwen/qwen3.8-27b").trim();
  try {
    persistEnvVar("GROQ_API_KEY", key);
    persistEnvVar("GROQ_MODEL", model);
    emitLive("config", { message: key ? "Groq key saved" : "Groq key cleared" });
    res.json({ ok: true, set: Boolean(key) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to save Groq key." });
  }
});

// Google Gemini API Key (World-Class Multilingual Reasoning)
app.get("/api/config/gemini-key", (_req, res) => {
  const k = (process.env.GEMINI_WHATSAPP_KEY || process.env.GEMINI_API_KEY || "").trim();
  const model = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
  res.json({ ok: true, set: Boolean(k), hint: k ? `AIza…${k.slice(-4)}` : "", model });
});

app.post("/api/config/gemini-key", (req, res) => {
  const key = String(req.body?.key || "").trim();
  const model = String(req.body?.model || "gemini-2.5-flash").trim();
  try {
    persistEnvVar("GEMINI_WHATSAPP_KEY", key);
    persistEnvVar("GEMINI_API_KEY", key);
    persistEnvVar("GEMINI_MODEL", model);
    emitLive("config", { message: key ? "Google Gemini API key saved" : "Google Gemini key cleared" });
    res.json({ ok: true, set: Boolean(key) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to save Gemini key." });
  }
});

// OpenAI / OpenRouter API Key
app.get("/api/config/openai-key", (_req, res) => {
  const k = (process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || "").trim();
  res.json({ ok: true, set: Boolean(k), hint: k ? `sk-…${k.slice(-4)}` : "" });
});

app.post("/api/config/openai-key", (req, res) => {
  const key = String(req.body?.key || "").trim();
  try {
    persistEnvVar("OPENAI_API_KEY", key);
    emitLive("config", { message: key ? "OpenAI/OpenRouter key saved" : "OpenAI key cleared" });
    res.json({ ok: true, set: Boolean(key) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to save OpenAI key." });
  }
});

// Cloudflare Workers AI API configuration
app.get("/api/config/cloudflare-key", (_req, res) => {
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const token = (process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY || "").trim();
  const model = (process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.3-70b-instruct").trim();
  res.json({
    ok: true,
    set: Boolean(accountId && token),
    accountIdHint: accountId ? `${accountId.slice(0, 6)}…${accountId.slice(-4)}` : "",
    tokenHint: token ? `…${token.slice(-4)}` : "",
    model,
  });
});

app.post("/api/config/cloudflare-key", (req, res) => {
  const accountId = String(req.body?.accountId || "").trim();
  const token = String(req.body?.token || "").trim();
  const model = String(req.body?.model || "@cf/meta/llama-3.3-70b-instruct").trim();
  try {
    persistEnvVar("CLOUDFLARE_ACCOUNT_ID", accountId);
    persistEnvVar("CLOUDFLARE_API_TOKEN", token);
    persistEnvVar("CLOUDFLARE_MODEL", model);
    emitLive("config", { message: (accountId && token) ? "Cloudflare Workers AI credentials saved" : "Cloudflare credentials cleared" });
    res.json({ ok: true, set: Boolean(accountId && token) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to save Cloudflare credentials." });
  }
});

// GitHub Models API configuration (100% Free via GitHub Personal Access Token)
app.get("/api/config/github-key", (_req, res) => {
  const token = (process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_TOKEN || "").trim();
  const model = (process.env.GITHUB_MODEL || "gpt-4o-mini").trim();
  res.json({
    ok: true,
    set: Boolean(token),
    hint: token ? `ghp_…${token.slice(-4)}` : "",
    model,
  });
});

app.post("/api/config/github-key", (req, res) => {
  const token = String(req.body?.token || "").trim();
  const model = String(req.body?.model || "gpt-4o-mini").trim();
  try {
    persistEnvVar("GITHUB_TOKEN", token);
    persistEnvVar("GITHUB_MODELS_TOKEN", token);
    persistEnvVar("GITHUB_MODEL", model);
    emitLive("config", { message: token ? "GitHub Models token saved" : "GitHub token cleared" });
    res.json({ ok: true, set: Boolean(token) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to save GitHub token." });
  }
});

// Mistral AI API configuration (1 Billion Free Tokens/Month Experiment Tier)
app.get("/api/config/mistral-key", (_req, res) => {
  const key = (process.env.MISTRAL_API_KEY || "").trim();
  const model = (process.env.MISTRAL_MODEL || "mistral-small-latest").trim();
  res.json({
    ok: true,
    set: Boolean(key),
    hint: key ? `…${key.slice(-4)}` : "",
    model,
  });
});

app.post("/api/config/mistral-key", (req, res) => {
  const key = String(req.body?.key || "").trim();
  const model = String(req.body?.model || "mistral-small-latest").trim();
  try {
    persistEnvVar("MISTRAL_API_KEY", key);
    persistEnvVar("MISTRAL_MODEL", model);
    emitLive("config", { message: key ? "Mistral AI key saved" : "Mistral AI key cleared" });
    res.json({ ok: true, set: Boolean(key) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to save Mistral key." });
  }
});

// SambaNova Cloud API configuration (100% Free Developer Tier 400 T/s)
app.get("/api/config/sambanova-key", (_req, res) => {
  const key = (process.env.SAMBANOVA_API_KEY || "").trim();
  const model = (process.env.SAMBANOVA_MODEL || "Meta-Llama-3.1-70B-Instruct").trim();
  res.json({
    ok: true,
    set: Boolean(key),
    hint: key ? `…${key.slice(-4)}` : "",
    model,
  });
});

app.post("/api/config/sambanova-key", (req, res) => {
  const key = String(req.body?.key || "").trim();
  const model = String(req.body?.model || "Meta-Llama-3.1-70B-Instruct").trim();
  try {
    persistEnvVar("SAMBANOVA_API_KEY", key);
    persistEnvVar("SAMBANOVA_MODEL", model);
    emitLive("config", { message: key ? "SambaNova key saved" : "SambaNova key cleared" });
    res.json({ ok: true, set: Boolean(key) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to save SambaNova key." });
  }
});

// Together AI API configuration (Open-Source Free Models)
app.get("/api/config/together-key", (_req, res) => {
  const key = (process.env.TOGETHER_API_KEY || "").trim();
  const model = (process.env.TOGETHER_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo").trim();
  res.json({
    ok: true,
    set: Boolean(key),
    hint: key ? `…${key.slice(-4)}` : "",
    model,
  });
});

app.post("/api/config/together-key", (req, res) => {
  const key = String(req.body?.key || "").trim();
  const model = String(req.body?.model || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo").trim();
  try {
    persistEnvVar("TOGETHER_API_KEY", key);
    persistEnvVar("TOGETHER_MODEL", model);
    emitLive("config", { message: key ? "Together AI key saved" : "Together AI key cleared" });
    res.json({ ok: true, set: Boolean(key) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to save Together key." });
  }
});

// ── WhatsApp CRM & Leads Endpoints ──────────────────────────────────────────
app.get("/api/whatsapp/crm", (_req, res) => {
  try {
    const summary = waCrmSummary();
    const contacts = waCrmListContacts();
    res.json({ ok: true, summary, contacts });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to load CRM data." });
  }
});

app.post("/api/whatsapp/crm/status", (req, res) => {
  try {
    const { number, status, saleAmount } = req.body || {};
    if (!number || !status) return res.status(400).json({ ok: false, error: "number and status are required" });
    const updated = waCrmUpdateDealStatus(String(number), status, typeof saleAmount === "number" ? saleAmount : undefined);
    res.json({ ok: true, contact: updated });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to update deal status." });
  }
});

// Website Leads & Widget Clicks
app.get("/api/crm/web_whatsapp", (_req, res) => {
  try {
    res.json({ ok: true, leads: waCrmGetLeadSources() });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to get web whatsapp leads." });
  }
});

app.get("/api/crm/whatsapp_clicks", (_req, res) => {
  try {
    res.json({ ok: true, clicks: waCrmGetLeadSources() });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to get whatsapp clicks." });
  }
});

// Blocklist Management (prevent bot answering team/family/owner)
app.get("/api/whatsapp/blocklist", (req, res) => {
  try {
    const id = String(req.query?.id ?? "0");
    res.json({ ok: true, id, blocklist: getWhatsappBlocklist(id) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to fetch blocklist." });
  }
});

app.post("/api/whatsapp/blocklist", (req, res) => {
  try {
    const id = String(req.body?.id ?? "0");
    const numbers = Array.isArray(req.body?.numbers) ? req.body.numbers : [];
    setWhatsappBlocklist(numbers, id);
    emitLive("config", { message: `WhatsApp[${id}] blocklist updated (${numbers.length} numbers)` });
    res.json({ ok: true, id, blocklist: getWhatsappBlocklist(id) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to update blocklist." });
  }
});

// WhatsApp Account Mode ('agent' vs 'commander')
app.get("/api/whatsapp/mode", (req, res) => {
  try {
    const id = String(req.query?.id ?? "0");
    res.json({ ok: true, id, mode: getWhatsappMode(id) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to fetch mode." });
  }
});

app.post("/api/whatsapp/mode", (req, res) => {
  try {
    const id = String(req.body?.id ?? "0");
    const mode = String(req.body?.mode || "agent") as "agent" | "commander";
    setWhatsappMode(mode, id);
    emitLive("config", { message: `WhatsApp[${id}] mode set to ${mode}` });
    res.json({ ok: true, id, mode: getWhatsappMode(id) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to set mode." });
  }
});

// Follow-up Intelligence
app.get("/api/whatsapp/followups", async (_req, res) => {
  try {
    const data = await scanFollowupsDeep(60, 30);
    res.json({ ok: true, ...data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to scan followups." });
  }
});

// Health check.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "whatsapp-agent", time: new Date().toISOString() });
});

// Channel + event routes.
registerChannelRoutes(app);
registerEventRoutes(app);

// ── static frontend (production) ─────────────────────────────────────────────
const distCandidates = [
  process.env.FRONTEND_DIR,
  path.join(currentDir, "frontend"),
  path.join(currentDir, "..", "frontend"),
  path.join(currentDir, "..", "..", "dist", "frontend"),
  path.join(process.cwd(), "dist", "frontend")
].filter(Boolean) as string[];

const distDir = distCandidates.find(d => fs.existsSync(d)) || path.join(process.cwd(), "dist", "frontend");
if (fs.existsSync(distDir)) {
  console.log(`[WhatsApp Agent] Serving static frontend from: ${distDir}`);
  app.use(express.static(distDir));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/ws")) {
      return res.status(404).json({ ok: false, error: "API endpoint not found" });
    }
    res.sendFile(path.join(distDir, "index.html"));
  });
} else {
  console.warn(`[WhatsApp Agent] Warning: Frontend distDir not found. Checked:`, distCandidates);
}

// ── Server + Live Event WebSocket with Dynamic Port Fallback (from DIGI LABS) ──
let activeServer: http.Server | null = null;

async function startLiveEventsWs(srv: http.Server): Promise<void> {
  const { WebSocketServer } = await import("ws");
  const wss = new WebSocketServer({ server: srv, path: "/ws/events" });

  attachSink((payload: string) => {
    for (const client of wss.clients) {
      if (client.readyState === 1) { try { client.send(payload); } catch { } }
    }
  });

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ event: "hello", data: { service: "whatsapp-agent" } }));
  });

  console.log("[WS] live events at /ws/events");
}

function listenWithFallback(port: number, triesLeft = 12): void {
  const srv = http.createServer(app);
  activeServer = srv;

  srv.on("listening", async () => {
    (global as any).__DIGI_WA_PORT = port;
    try {
      const base = process.env.MYRAA_DATA_DIR || process.env.DIGI_DATA_DIR || path.join(process.cwd(), "data");
      fs.mkdirSync(base, { recursive: true });
      fs.writeFileSync(path.join(base, ".port"), String(port), "utf-8");
    } catch { }
    console.log(`[WhatsApp Agent] backend listening on http://127.0.0.1:${port}`);
    await startLiveEventsWs(srv);

    // Auto-reconnect any account that already has a saved session
    for (const acc of whatsappList()) {
      if (acc.hasSession && acc.status.state !== "connected") {
        console.log(`[WhatsApp Agent] restoring session for account ${acc.id}…`);
        void whatsappConnect(acc.id).then(() => {
          emitLive("channel_message", { message: `WhatsApp[${acc.id}] session restored` });
        }).catch(() => { });
      }
    }
  });

  srv.on("error", (err: any) => {
    if (err && err.code === "EADDRINUSE" && triesLeft > 0) {
      console.warn(`[WhatsApp Agent] port ${port} in use — stepping to ${port + 1}`);
      setTimeout(() => listenWithFallback(port + 1, triesLeft - 1), 150);
    } else {
      console.error("[WhatsApp Agent] server could not listen:", err && err.message);
    }
  });

  srv.listen(port, "127.0.0.1");
}

if (process.env.NODE_ENV !== "test") {
  listenWithFallback(PORT, 12);
}

export { app, activeServer as server };
