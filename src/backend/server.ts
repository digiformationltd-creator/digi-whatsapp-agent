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

import {
  whatsappConnect,
  whatsappDisconnect,
  whatsappSend,
  whatsappList,
  getWhatsappKnowledge,
  setWhatsappKnowledge,
  getWhatsappAgentActive,
  setWhatsappAgentActive,
  registerChannelRoutes,
  setChannelRouter,
  channelStatus,
  isGroupJid,
} from "./channels";
import { parseAndNormalizeKnowledge, SUPPORTED_EXTENSIONS } from "./knowledge_parser";
import { emit as emitLive, attachSink, registerEventRoutes } from "../shared/live_events";

// ── environment ──────────────────────────────────────────────────────────────
dotenv.config();

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
          model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
          messages: [{ role: "user", content: clean }],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (r.ok) {
        const d: any = await r.json();
        const reply = String(d?.choices?.[0]?.message?.content || "").trim();
        if (reply) {
          console.log("[Brain] Groq (llama-3.1-8b-instant) generated response");
          return { ok: true, text: reply };
        }
      }
    } catch { /* fall through */ }
  }

  emitLive("warning", { message: `No AI provider configured (${source})`, detail: "Set WHATSAPP_AGENT_KEY or GROQ_API_KEY in .env" });
  return { ok: false, text: "(no reply)" };
}

setChannelRouter(defaultBrainRouter);

// ── WhatsApp API routes (faithful to the original server.ts) ────────────────

// Status of one WhatsApp account (?id=0|1|2, default 0).
app.get("/api/whatsapp/status", (req, res) => {
  const id = String(req.query?.id ?? "0");
  const s = channelStatus(id === "0" ? "whatsapp" : `whatsapp:${id}`);
  const state = s?.state || "disconnected";
  res.json({
    id,
    connected: state === "connected",
    status: state,
    phone: (s as any)?.account || null,
    qr: s?.qr || null,
    agentActive: getWhatsappAgentActive(id),
    message: s?.detail || "WhatsApp not linked yet. Tap Connect to show a pairing QR.",
  });
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

// All WhatsApp accounts at once — powers the multi-number list.
app.get("/api/whatsapp/list", (_req, res) => {
  try { res.json({ ok: true, max: 3, accounts: whatsappList() }); }
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
  process.env.WHATSAPP_AGENT_KEY = key; // takes effect immediately (no restart needed)
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      let txt = fs.readFileSync(envPath, "utf-8");
      const re = /^WHATSAPP_AGENT_KEY=.*$/m;
      if (re.test(txt)) txt = txt.replace(re, `WHATSAPP_AGENT_KEY=${key}`);
      else txt += `\nWHATSAPP_AGENT_KEY=${key}\n`;
      fs.writeFileSync(envPath, txt);
    }
    emitLive("config", { message: key ? "Agent AI key saved" : "Agent AI key cleared" });
    res.json({ ok: true, set: Boolean(key) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to save key." });
  }
});

// Groq Whisper Voice Transcription Key
app.get("/api/config/groq-key", (_req, res) => {
  const k = (process.env.GROQ_API_KEY || "").trim();
  res.json({ ok: true, set: Boolean(k), hint: k ? `gsk_…${k.slice(-4)}` : "" });
});

app.post("/api/config/groq-key", (req, res) => {
  const key = String(req.body?.key || "").trim();
  process.env.GROQ_API_KEY = key;
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      let txt = fs.readFileSync(envPath, "utf-8");
      const re = /^GROQ_API_KEY=.*$/m;
      if (re.test(txt)) txt = txt.replace(re, `GROQ_API_KEY=${key}`);
      else txt += `\nGROQ_API_KEY=${key}\n`;
      fs.writeFileSync(envPath, txt);
    }
    emitLive("config", { message: key ? "Groq Whisper key saved" : "Groq Whisper key cleared" });
    res.json({ ok: true, set: Boolean(key) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to save Groq key." });
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
  path.join(__dirname, "frontend"),
  path.join(__dirname, "..", "frontend"),
  path.join(__dirname, "..", "..", "dist", "frontend"),
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

// ── server + live event websocket ────────────────────────────────────────────
const server = http.createServer(app);

async function startLiveEventsWs(): Promise<void> {
  const { WebSocketServer } = await import("ws");
  const wss = new WebSocketServer({ server, path: "/ws/events" });

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

server.listen(PORT, async () => {
  console.log(`[WhatsApp Agent] backend listening on http://localhost:${PORT}`);
  await startLiveEventsWs();

  // Auto-reconnect any account that already has a saved session, mirroring the
  // original app's behaviour ("no QR appeared" after restart is success).
  for (const acc of whatsappList()) {
    if (acc.hasSession && acc.status.state !== "connected") {
      console.log(`[WhatsApp Agent] restoring session for account ${acc.id}…`);
      void whatsappConnect(acc.id).then(() => {
        emitLive("channel_message", { message: `WhatsApp[${acc.id}] session restored` });
      }).catch(() => { });
    }
  }
});

export { app, server };
