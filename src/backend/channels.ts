import fs from "fs";
import path from "path";
import type { Express, Request, Response } from "express";
import { emit as emitLive } from "../shared/live_events";
import type { ChannelState, ChannelStatus, WhatsAppAccount, WhatsAppListResponse } from "../shared/types";
import { parseAndNormalizeKnowledge, SUPPORTED_EXTENSIONS } from "./knowledge_parser";
import { sanitizeWhatsAppReply } from "./sanitizer";
import { matchSectionFromKb } from "./engine/deterministic";

const WA_MAX = 1;
const WA_IDS = ["0"];

type WaAccount = { socket: any; stopping: boolean };
const waAcc: Record<string, WaAccount> = {
  "0": { socket: null, stopping: false },
};

export type ChannelStateType = ChannelState;

export interface ChannelStatusType extends ChannelStatus {}

const status: Record<string, ChannelStatusType> = {
  whatsapp: { id: "whatsapp", state: "disconnected", detail: "Not connected", since: 0 },
  discord: { id: "discord", state: "disconnected", detail: "Not connected", since: 0 },
};

for (const _id of WA_IDS) {
  const key = _id === "0" ? "whatsapp" : `whatsapp:${_id}`;
  if (!status[key]) status[key] = { id: key, state: "disconnected", detail: "Not connected", since: 0 };
}

function setStatus(id: string, patch: Partial<ChannelStatusType>): void {
  const prev = status[id];
  status[id] = { ...prev, ...patch, since: Date.now() };
  if (patch.state && patch.state !== prev.state) {
    emitLive("channel_message", {
      message: `${id}: ${patch.state.replace("_", " ")}`,
      detail: patch.detail || status[id].detail,
    });
  }
}

export function channelStatus(id: string): ChannelStatusType | undefined {
  return status[id];
}

function sessionDir(name: string): string {
  const base = process.env.MYRAA_DATA_DIR || process.env.DIGI_DATA_DIR || path.join(process.cwd(), "data");
  const dir = path.join(base, "channels", name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function knowledgeFile(id = "0"): string {
  const base = process.env.MYRAA_DATA_DIR || process.env.DIGI_DATA_DIR || path.join(process.cwd(), "data");
  try { fs.mkdirSync(base, { recursive: true }); } catch { }
  const filename = id === "0" ? "whatsapp_knowledge.md" : `whatsapp_knowledge_${id}.md`;
  const target = path.join(base, filename);
  if (!fs.existsSync(target)) {
    let modDir = "";
    try { if (typeof __dirname !== "undefined" && __dirname) modDir = __dirname; } catch { }

    const candidates = [
      path.join(process.cwd(), "data", filename),
      path.join(process.cwd(), "data", "whatsapp_knowledge.md"),
      (process as any).resourcesPath ? path.join((process as any).resourcesPath, "data", filename) : null,
      (process as any).resourcesPath ? path.join((process as any).resourcesPath, "data", "whatsapp_knowledge.md") : null,
      modDir ? path.join(modDir, "..", "..", "data", filename) : null,
      modDir ? path.join(modDir, "..", "data", filename) : null,
    ].filter(Boolean) as string[];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        try { fs.copyFileSync(c, target); break; } catch { }
      }
    }
  }

  return target;
}

export function getWhatsappKnowledge(id = "0"): string {
  try {
    const p = knowledgeFile(id);
    if (fs.existsSync(p)) {
      const text = fs.readFileSync(p, "utf-8").trim();
      if (text) return text;
    }
  } catch { }

  const rootCandidates = [
    path.join(process.cwd(), "data", id === "0" ? "whatsapp_knowledge.md" : `whatsapp_knowledge_${id}.md`),
    path.join(process.cwd(), "data", "whatsapp_knowledge.md"),
  ];
  for (const rc of rootCandidates) {
    if (fs.existsSync(rc)) {
      try {
        const text = fs.readFileSync(rc, "utf-8").trim();
        if (text) return text;
      } catch { }
    }
  }
  return "";
}

export function setWhatsappKnowledge(content: string, id = "0", filenameOrFormat = "md"): { ok: boolean; error?: string } {
  const result = parseAndNormalizeKnowledge(content, filenameOrFormat);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  const text = String(result.normalizedText ?? "");
  fs.writeFileSync(knowledgeFile(id), text, "utf-8");

  // Also sync to cwd/data so both paths stay in sync
  try {
    const rootTarget = path.join(process.cwd(), "data", id === "0" ? "whatsapp_knowledge.md" : `whatsapp_knowledge_${id}.md`);
    fs.writeFileSync(rootTarget, text, "utf-8");
  } catch { }

  return { ok: true };
}

function agentFlagFile(id = "0"): string {
  const base = process.env.MYRAA_DATA_DIR || process.env.DIGI_DATA_DIR || path.join(process.cwd(), "data");
  try { fs.mkdirSync(base, { recursive: true }); } catch { }
  return path.join(base, id === "0" ? "whatsapp_agent_active.flag" : `whatsapp_agent_active_${id}.flag`);
}

export function getWhatsappAgentActive(id = "0"): boolean {
  try { return fs.readFileSync(agentFlagFile(id), "utf-8").trim() !== "0"; } catch { return true; }
}

export function setWhatsappAgentActive(active: boolean, id = "0"): void {
  fs.writeFileSync(agentFlagFile(id), active ? "1" : "0", "utf-8");
}

function blocklistFile(id = "0"): string {
  const base = process.env.MYRAA_DATA_DIR || process.env.DIGI_DATA_DIR || path.join(process.cwd(), "data");
  try { fs.mkdirSync(base, { recursive: true }); } catch { }
  return path.join(base, id === "0" ? "whatsapp_blocklist.json" : `whatsapp_blocklist_${id}.json`);
}

export function getWhatsappBlocklist(id = "0"): string[] {
  try {
    const arr = JSON.parse(fs.readFileSync(blocklistFile(id), "utf-8"));
    return Array.isArray(arr) ? arr.map((s) => String(s).replace(/\D/g, "")).filter(Boolean) : [];
  } catch { return []; }
}

export function setWhatsappBlocklist(numbers: string[], id = "0"): void {
  const clean = Array.from(new Set((numbers || []).map((s) => String(s).replace(/\D/g, "")).filter(Boolean)));
  fs.writeFileSync(blocklistFile(id), JSON.stringify(clean), "utf-8");
}

export function isBlocked(senderDigits: string, id = "0"): boolean {
  if (!senderDigits) return false;
  const list = getWhatsappBlocklist(id);
  return list.some((b) => b && (senderDigits.includes(b) || b.includes(senderDigits)));
}

function modeFlagFile(id = "0"): string {
  const base = process.env.MYRAA_DATA_DIR || process.env.DIGI_DATA_DIR || path.join(process.cwd(), "data");
  try { fs.mkdirSync(base, { recursive: true }); } catch { }
  return path.join(base, id === "0" ? "whatsapp_mode.flag" : `whatsapp_mode_${id}.flag`);
}

export function getWhatsappMode(id = "0"): "agent" | "commander" {
  try {
    const m = fs.readFileSync(modeFlagFile(id), "utf-8").trim().toLowerCase();
    if (m === "agent") return "agent";
    if (m === "commander") {
      if (getWhatsappKnowledge(id).trim() && getWhatsappAgentActive(id)) return "agent";
      return "commander";
    }
  } catch { }
  return getWhatsappKnowledge(id).trim() ? "agent" : "commander";
}

export function setWhatsappMode(mode: "agent" | "commander", id = "0"): void {
  try { fs.writeFileSync(modeFlagFile(id), mode, "utf-8"); } catch { }
}

/**
 * Hard Group Detection Guard
 * Checks whether a given WhatsApp JID or identifier is a WhatsApp Group, Broadcast, or Newsletter.
 */
export function isGroupJid(jid: string): boolean {
  if (!jid) return false;
  const clean = jid.trim().toLowerCase();
  return (
    clean.endsWith("@g.us") ||
    clean.endsWith("@broadcast") ||
    clean.endsWith("@newsletter") ||
    clean === "status@broadcast"
  );
}

import { getAgentCoreSystemPrompt } from "./core/agent_rules";

const PERMANENT_AGENT_SYSTEM_RULES = getAgentCoreSystemPrompt();

import {
  getConversationMemory,
  recordInboundMessage,
  recordOutboundMessage,
  isMemoryEnabled,
  resolveCustomerId,
} from "./memory";
import { AIOrchestrator } from "./engine/ai_orchestrator";
import { LangGraphEngine } from "./engine/langgraph_agent";
import { waCrmRecordContact } from "./crm/wa_crm";
import { HumanHandoff } from "./handoff";
import { processVoiceReply } from "./voice";

function frameSalesPrompt(customerText: string, memoryContext = "", id = "0", jid = ""): string {
  const kb = getWhatsappKnowledge(id).trim();
  let out = PERMANENT_AGENT_SYSTEM_RULES;
  
  if (kb) {
    out += "\n\n=== BUSINESS KNOWLEDGE BASE (Products, Services, Pricing, FAQs, Policies) ===\n" + kb;
  } else {
    out += "\n\n=== BUSINESS KNOWLEDGE BASE ===\n(No custom business knowledge uploaded yet. Assist the customer politely using general company support principles without quoting specific unlisted prices).";
  }

  // Phase 1: Memory Foundation (Durable Customer Profile + Short-Term Rolling Window)
  if (jid && isMemoryEnabled()) {
    const memContext = getConversationMemory(jid);
    if (memContext) {
      out += "\n\n" + memContext;
    }
  } else if (memoryContext) {
    out += "\n\n=== RECALLED CUSTOMER MEMORY & CONTEXT ===\n" + memoryContext;
  }

  out += "\n\n=== INCOMING CUSTOMER MESSAGE (reply to this) ===\n" + customerText;
  return out;
}

import { transcribeAudioMessage } from "./transcriber";

async function transcribeVoice(buffer: Buffer, mimeType = "audio/ogg"): Promise<string> {
  return transcribeAudioMessage(buffer, mimeType);
}

const WA_FALLBACK =
  "Aapka message receive ho chuka hai! DIGI BIZ OS (Lifetime Licence: PKR 14,900) ke baare mein mazeed details ya immediate setup ke liye aap direct hamari official team se WhatsApp +92 316 446 7464 ya info@digiformation.co.uk par bhi rabta kar saktay hain.";

export async function generateSalesReply(framedPrompt: string): Promise<string> {
  const clean = (framedPrompt || "").trim();
  if (!clean) return "";

  let zenKey = (process.env.WHATSAPP_AGENT_KEY || "").trim();
  let groqKey = (process.env.GROQ_API_KEY || "").trim();
  let geminiKey = (process.env.GEMINI_WHATSAPP_KEY || process.env.GEMINI_API_KEY || "").trim();
  let openaiKey = (process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || "").trim();

  // 1) Google Gemini (Primary Reasoning Provider)
  if (geminiKey) {
    const geminiModels = [
      process.env.GEMINI_MODEL,
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-flash-latest",
      "gemini-3.8-flash",
    ].filter(Boolean) as string[];

    for (const model of geminiModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: clean }] }],
            generationConfig: {
              maxOutputTokens: 450,
              temperature: 0.3,
            },
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) continue;
        const d: any = await r.json();
        const text = String((d?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join("")).trim();
        if (text && !text.toLowerCase().startsWith("error:")) {
          console.log(`[Sales Brain] Answer generated via Google Gemini (${model})`);
          return sanitizeWhatsAppReply(text);
        }
      } catch { }
    }
  }

  // 2) Groq Ultra-Fast Cloud Models (~300ms, max_tokens: 450)
  if (groqKey) {
    const groqModels = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "allam-2-7b"];
    for (const model of groqModels) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model,
            max_tokens: 450,
            temperature: 0.3,
            messages: [{ role: "user", content: clean }],
          }),
          signal: AbortSignal.timeout(12000),
        });
        if (r.ok) {
          const d: any = await r.json();
          const text = String(d?.choices?.[0]?.message?.content || "").trim();
          if (text && !text.toLowerCase().startsWith("error:")) {
            console.log(`[Sales Brain] Answer generated via Groq (${model})`);
            return sanitizeWhatsAppReply(text);
          }
        }
      } catch (e: any) {
        console.error(`[Sales Brain] Groq (${model}) error:`, e?.message);
      }
    }
  }

  // 3) Cloudflare Workers AI (Serverless Edge Inference)
  const cfAccountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const cfToken = (process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY || "").trim();
  if (cfAccountId && cfToken) {
    const preferredModel = (process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.3-70b-instruct").trim();
    const cfModels = [
      preferredModel,
      "@cf/meta/llama-3.3-70b-instruct",
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
      "@cf/qwen/qwen2.5-7b-instruct",
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (const model of cfModels) {
      try {
        const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${model}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfToken}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: clean }],
            max_tokens: 450,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (r.ok) {
          const d: any = await r.json();
          const text = String(d?.result?.response || d?.result || "").trim();
          if (text && !text.toLowerCase().startsWith("error:")) {
            console.log(`[Sales Brain] Answer generated via Cloudflare Workers AI (${model})`);
            return sanitizeWhatsAppReply(text);
          }
        }
      } catch (e: any) {
        console.error(`[Sales Brain] Cloudflare (${model}) error:`, e?.message);
      }
    }
  }

  // 4) Mistral AI (1 Billion Tokens/Month Free Experiment Tier)
  const mistralKey = (process.env.MISTRAL_API_KEY || "").trim();
  if (mistralKey) {
    const mistralModels = [
      process.env.MISTRAL_MODEL,
      "mistral-small-latest",
      "open-mistral-7b",
      "codestral-latest",
    ].filter(Boolean) as string[];

    for (const model of mistralModels) {
      try {
        const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mistralKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: clean }],
            max_tokens: 450,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (r.ok) {
          const d: any = await r.json();
          const text = String(d?.choices?.[0]?.message?.content || "").trim();
          if (text && !text.toLowerCase().startsWith("error:")) {
            console.log(`[Sales Brain] Answer generated via Mistral AI (${model})`);
            return sanitizeWhatsAppReply(text);
          }
        }
      } catch (e: any) {
        console.error(`[Sales Brain] Mistral AI (${model}) error:`, e?.message);
      }
    }
  }

  // 5) GitHub Models (100% Free AI Tier via GitHub Token)
  const ghToken = (process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_TOKEN || "").trim();
  if (ghToken) {
    const ghModels = [
      process.env.GITHUB_MODEL,
      "gpt-4o-mini",
      "Meta-Llama-3.1-70B-Instruct",
      "Phi-3.5-mini-instruct",
    ].filter(Boolean) as string[];

    for (const model of ghModels) {
      try {
        const r = await fetch("https://models.inference.ai.azure.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ghToken}`,
          },
          body: JSON.stringify({
            model,
            max_tokens: 450,
            temperature: 0.3,
            messages: [{ role: "user", content: clean }],
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (r.ok) {
          const d: any = await r.json();
          const text = String(d?.choices?.[0]?.message?.content || "").trim();
          if (text && !text.toLowerCase().startsWith("error:")) {
            console.log(`[Sales Brain] Answer generated via GitHub Models (${model})`);
            return sanitizeWhatsAppReply(text);
          }
        }
      } catch (e: any) {
        console.error(`[Sales Brain] GitHub Models (${model}) error:`, e?.message);
      }
    }
  }

  // 6) SambaNova Cloud (100% Free Developer Tier 400 T/s)
  const sambanovaKey = (process.env.SAMBANOVA_API_KEY || "").trim();
  if (sambanovaKey) {
    const snModels = [
      process.env.SAMBANOVA_MODEL,
      "Meta-Llama-3.1-70B-Instruct",
      "Meta-Llama-3.1-8B-Instruct",
      "Qwen2.5-72B-Instruct",
    ].filter(Boolean) as string[];

    for (const model of snModels) {
      try {
        const r = await fetch("https://api.sambanova.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sambanovaKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: clean }],
            max_tokens: 450,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (r.ok) {
          const d: any = await r.json();
          const text = String(d?.choices?.[0]?.message?.content || "").trim();
          if (text && !text.toLowerCase().startsWith("error:")) {
            console.log(`[Sales Brain] Answer generated via SambaNova Cloud (${model})`);
            return sanitizeWhatsAppReply(text);
          }
        }
      } catch (e: any) {
        console.error(`[Sales Brain] SambaNova Cloud (${model}) error:`, e?.message);
      }
    }
  }

  // 7) Together AI (Open-Source Free Models)
  const togetherKey = (process.env.TOGETHER_API_KEY || "").trim();
  if (togetherKey) {
    const togetherModels = [
      process.env.TOGETHER_MODEL,
      "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
    ].filter(Boolean) as string[];

    for (const model of togetherModels) {
      try {
        const r = await fetch("https://api.together.xyz/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${togetherKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: clean }],
            max_tokens: 450,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (r.ok) {
          const d: any = await r.json();
          const text = String(d?.choices?.[0]?.message?.content || "").trim();
          if (text && !text.toLowerCase().startsWith("error:")) {
            console.log(`[Sales Brain] Answer generated via Together AI (${model})`);
            return sanitizeWhatsAppReply(text);
          }
        }
      } catch (e: any) {
        console.error(`[Sales Brain] Together AI (${model}) error:`, e?.message);
      }
    }
  }

  return "";
}

const BRAIN_MEM_URL = `http://127.0.0.1:${process.env.BRAIN_PORT || 8770}/v1/memory`;

async function recallMemoryContext(subject: string, query: string): Promise<string> {
  if (process.env.BRAIN_ENABLED !== "1") return "";
  try {
    const r = await fetch(`${BRAIN_MEM_URL}/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, subject, layers: ["customer", "semantic", "identity"], max_chars: 800 }),
      signal: AbortSignal.timeout(1000),
    });
    if (!r.ok) return "";
    return String((await r.json())?.context || "").trim();
  } catch { return ""; }
}

function rememberFact(content: string, layer = "customer", subject = "whatsapp", importance = 1, kind = "observation"): void {
  if (process.env.BRAIN_ENABLED !== "1") return;
  void fetch(`${BRAIN_MEM_URL}/fact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, layer, subject, importance, kind }),
    signal: AbortSignal.timeout(1000),
  }).catch(() => {});
}

function normId(id: string | number = "0"): string {
  const s = String(id ?? "0").trim();
  return WA_IDS.includes(s) ? s : "0";
}

function waKey(id: string): string {
  return id === "0" ? "whatsapp" : `whatsapp:${id}`;
}

function waSessName(id: string): string {
  return id === "0" ? "whatsapp" : `whatsapp_${id}`;
}

export async function whatsappConnect(id: string = "0"): Promise<ChannelStatusType> {
  id = normId(id);
  const key = waKey(id);
  const acc = waAcc[id];

  if (acc.socket && (status[key].state === "connected" || status[key].state === "qr_ready")) {
    return status[key];
  }

  acc.stopping = false;
  setStatus(key, { state: "connecting", detail: "Starting session…", qr: undefined });

  try {
    const baileys = await import("@whiskeysockets/baileys");
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = baileys;
    const QRCode = (await import("qrcode")).default;

    const sDir = sessionDir(waSessName(id));
    const { state, saveCreds } = await useMultiFileAuthState(sDir);

    acc.socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ["WhatsApp Agent", "Chrome", "1.0.0"],
      syncFullHistory: false,
      markOnlineOnConnect: true,
    });

    acc.socket.ev.on("creds.update", async (creds: any) => {
      try {
        await saveCreds();
      } catch (err: any) {
        console.warn(`[WA] creds.update error for account ${id}:`, err?.message || err);
      }
    });

    acc.socket.ev.on("connection.update", async (u: any) => {
      try {
        const { connection, lastDisconnect, qr } = u;

        if (qr) {
          try {
            const png = await QRCode.toDataURL(qr, { margin: 1, width: 288 });
            setStatus(key, { state: "qr_ready", detail: "Scan this from WhatsApp → Linked devices → Link a device", qr: png });
          } catch (e: any) {
            console.warn("[WA] QRCode generation error:", e?.message || e);
          }
        }

        if (connection === "open") {
          const me = acc.socket?.user;
          setStatus(key, { state: "connected", detail: "Linked and online", qr: undefined, account: me?.name || me?.id?.split(":")[0] || "linked device" });
        }

        if (connection === "close") {
          const code = lastDisconnect?.error?.output?.statusCode;
          const loggedOut = code === DisconnectReason?.loggedOut;
          acc.socket = null;

          if (acc.stopping) {
            setStatus(key, { state: "disconnected", detail: "Disconnected by the owner", qr: undefined });
            return;
          }
          if (loggedOut) {
            try { fs.rmSync(sessionDir(waSessName(id)), { recursive: true, force: true }); } catch { }
            setStatus(key, { state: "disconnected", detail: "Unlinked from the phone. Connect again to scan a new code.", qr: undefined, account: undefined });
            return;
          }
          setStatus(key, { state: "error", detail: `Connection closed (${code ?? "unknown"}). Reconnecting…`, qr: undefined });
          setTimeout(() => {
            if (!acc.stopping) {
              whatsappConnect(id).catch((err: any) => {
                console.warn(`[WA] Reconnection catch for account ${id}:`, err?.message || err);
              });
            }
          }, 4000);
        }
      } catch (err: any) {
        console.warn(`[WA] connection.update error for account ${id}:`, err?.message || err);
      }
    });

    acc.socket.ev.on("messages.upsert", async (m: any) => {
      try {
        if (m?.type !== "notify") return;
        for (const msg of (m.messages || [])) {
          if (!msg?.message || msg.key?.fromMe) continue;
          const jid: string = msg.key?.remoteJid || "";
          if (!jid) continue;

          // ── HARD RULE 1: PERMANENTLY BLOCK ALL WHATSAPP GROUPS ──────────────
          // If message is from a WhatsApp Group, Broadcast, or Newsletter,
          // DO NOT process, DO NOT invoke AI, and DO NOT reply under any circumstance.
          const isGroup = isGroupJid(jid);
          if (isGroup) {
            emitLive("channel_message", {
              message: `WhatsApp[${id}] Group message dropped (HARD RULE: NEVER_REPLY_TO_GROUPS)`,
              detail: `Group: ${jid}`,
            });
            continue; // Immediate hard stop
          }

          const waMode = getWhatsappMode(id);
          const allow = (process.env.WHATSAPP_ALLOWED || "").split(",").map((s) => s.replace(/\D/g, "")).filter(Boolean);
          const senderDigits = jid.replace(/\D/g, "");
          const allowed = waMode === "agent"
            ? !isBlocked(senderDigits, id)
            : (allow.length > 0 && allow.some((a) => senderDigits.includes(a) || a.includes(senderDigits)));

          const rawMsg = msg.message || {};
          const msgContent =
            rawMsg.ephemeralMessage?.message ||
            rawMsg.viewOnceMessage?.message ||
            rawMsg.viewOnceMessageV2?.message ||
            rawMsg.documentWithCaptionMessage?.message ||
            rawMsg;

          // Multi-format document upload for Business Knowledge Base
          const doc = msgContent?.documentMessage || rawMsg?.documentMessage;
          if (doc && /\.(md|markdown|txt|json|yaml|yml|csv)$/i.test(String(doc.fileName || ""))) {
            if (!allowed) continue;
            try {
              const buf = await baileys.downloadMediaMessage(msg, "buffer", {});
              const raw = Buffer.from(buf).toString("utf-8");
              const parsed = parseAndNormalizeKnowledge(raw, String(doc.fileName || "md"));
              if (parsed.ok && parsed.normalizedText) {
                fs.writeFileSync(knowledgeFile(id), parsed.normalizedText, "utf-8");
                emitLive("file_action", { message: `Knowledge Base updated via WhatsApp from ${doc.fileName}` });
                await whatsappSend(jid, `✅ Business Knowledge Base update ho chuka hai (${doc.fileName})! Ab main aapke naye prices aur data ke mutabiq customers ko jawab doonga.`, id);
              } else {
                await whatsappSend(jid, `Could not process ${doc.fileName}: ${parsed.error || "Invalid file"}. Supported: MD, TXT, JSON, YAML, CSV.`, id);
              }
            } catch {
              await whatsappSend(jid, "Sorry, I couldn't read that file. Please send a valid MD, TXT, JSON, YAML, or CSV document.", id);
            }
            continue;
          }

          let text = String(
            msgContent?.conversation ||
            msgContent?.extendedTextMessage?.text ||
            msgContent?.imageMessage?.caption ||
            ""
          ).trim();

          let isVoiceInbound = false;
          const audio = msgContent?.audioMessage || msgContent?.pttMessage;
          if (!text && audio) {
            if (!allowed) continue;
            isVoiceInbound = true;
            emitLive("channel_message", {
              message: `WhatsApp[${id}] Audio voice note received (${audio.seconds || 0}s)`,
              detail: `Phone: ${jid}`,
            });
            try {
              const buf = await baileys.downloadMediaMessage(msg, "buffer", {});
              const mime = String(audio.mimetype || "audio/ogg");
              text = (await transcribeVoice(Buffer.from(buf), mime)).trim();
            } catch (err: any) {
              console.error(`[WhatsApp] Audio download/transcribe error:`, err?.message || err);
            }
            if (!text) {
              emitLive("channel_message", {
                message: `WhatsApp[${id}] Voice transcription failed → sending holding reply`,
                detail: `Phone: ${jid}`,
              });
              if (getWhatsappAgentActive(id)) void whatsappSend(jid, WA_FALLBACK, id);
              continue;
            }
            emitLive("channel_message", {
              message: `WhatsApp[${id}] Voice transcribed: "${text.slice(0, 100)}"`,
              detail: `Phone: ${jid}`,
            });
          }

          if (!text) continue;
          if (!allowed) {
            emitLive("channel_message", {
              message: `WhatsApp[${id}] Inbound from ${senderDigits} blocked (${waMode === "agent" ? "in blocklist" : "not in allowlist"})`,
              detail: `Phone: ${jid}`,
            });
            continue;
          }

          if (!getWhatsappAgentActive(id)) {
            rememberFact(text, "customer", `whatsapp:${jid}`, 2, "message");
            emitLive("channel_message", { message: `WhatsApp[${id}] → agent paused (no reply)`, detail: text.slice(0, 120) });
            continue;
          }

          console.log(`[WhatsApp Inbound] Message received from ${jid}: "${text}"`);
          emitLive("channel_message", { message: `WhatsApp[${id}] AI reasoning...`, detail: text.slice(0, 120) });
          
          // WhatsApp CRM contact recording
          try {
            waCrmRecordContact(jid, (msg.pushName as string) || undefined);
          } catch { /* best-effort */ }

          // Phase 1 & 2: Record inbound message into Memory & State Foundation
          recordInboundMessage(jid, text, (msg.pushName as string) || undefined);
          rememberFact(text, "customer", `whatsapp:${jid}`, 2, "message");

          // Phase 8: Check Human Handoff trigger
          if (HumanHandoff.isHandoffRequested(text)) {
            const handoffMsg = HumanHandoff.getHandoffMessage();
            console.log(`[WhatsApp Outbound] Human handoff triggered for ${jid}`);
            await whatsappSend(jid, handoffMsg, id);
            recordOutboundMessage(jid, handoffMsg);
            continue;
          }

          recallMemoryContext(`whatsapp:${jid}`, text).then(async (mem) => {
            const custId = resolveCustomerId(jid);
            
            // 1. Primary LangGraph StateGraph Execution
            let reply = "";
            const kbContent = getWhatsappKnowledge(id);
            try {
              const graphResult = await LangGraphEngine.run(text, jid, custId, {
                kbContent,
              });
              reply = graphResult.response || "";
            } catch (graphErr: any) {
              console.warn("[WhatsApp] LangGraph execution warning:", graphErr?.message);
            }

            // 2. Deterministic AI Orchestrator Fallback (with Knowledge Base)
            if (!reply) {
              reply = await AIOrchestrator.generateReply(text, jid, custId, kbContent);
            }
            
            // 3. Fallback to sales prompt LLM chain
            if (!reply) {
              const framed = frameSalesPrompt(text, mem, id, jid);
              reply = await generateSalesReply(framed);
            }

            // 4. Resilient Knowledge Base Section Matching Fallback
            if (!reply && kbContent) {
              const matchedSec = matchSectionFromKb(text, kbContent);
              if (matchedSec) {
                console.log(`[WhatsApp] Matched section from Knowledge Base directly`);
                reply = sanitizeWhatsAppReply(matchedSec);
              }
            }
            
            const fellBack = !reply;
            if (!reply) reply = WA_FALLBACK;

            // Phase V: Voice Reply Layer (§41)
            let voiceSent = false;
            if (isVoiceInbound) {
              try {
                const voiceRes = await processVoiceReply(isVoiceInbound, reply);
                if (voiceRes.shouldSendVoice && voiceRes.audioBuffer) {
                  console.log(`[WhatsApp Outbound] Sending Voice Note (PTT) reply to ${jid}`);
                  const sendVoiceRes = await whatsappSendVoice(jid, voiceRes.audioBuffer, id);
                  if (sendVoiceRes.ok) {
                    voiceSent = true;
                  }
                }
              } catch (e: any) {
                console.error("[WhatsApp] Voice reply synthesis error:", e?.message);
              }
            }

            // If voice was not sent (not eligible or text-only required), send clean text reply
            if (!voiceSent) {
              console.log(`[WhatsApp Outbound] Sending text reply to ${jid}: "${reply.slice(0, 100)}..."`);
              const sendRes = await whatsappSend(jid, reply, id);
              console.log(`[WhatsApp Outbound] Delivery result:`, sendRes);
            }
            
            // Record outbound reply into Memory
            if (!fellBack) {
              recordOutboundMessage(jid, reply);
              rememberFact(`Assistant replied: ${reply}`, "customer", `whatsapp:${jid}`, 1, "reply");
            }
          }).catch((err) => {
            console.error("[WhatsApp] Reply generation error:", err?.message || err);
            void whatsappSend(jid, WA_FALLBACK, id);
          });
        }
      } catch { }
    });

    return status[key];
  } catch (e: any) {
    setStatus(key, { state: "error", detail: e?.message || "Failed to start", qr: undefined });
    acc.socket = null;
    return status[key];
  }
}

type ChannelRouter = (text: string, source: string) => Promise<{ ok: boolean; text: string }>;
let brainRouter: ChannelRouter | null = null;
export function setChannelRouter(fn: ChannelRouter): void { brainRouter = fn; }

export async function whatsappDisconnect(id: string | boolean = "0", wipe = false): Promise<ChannelStatusType> {
  if (typeof id === "boolean") { wipe = id; id = "0"; }
  id = normId(id as string);
  const key = waKey(id);
  const acc = waAcc[id];
  acc.stopping = true;
  try {
    if (wipe && acc.socket?.logout) await acc.socket.logout().catch(() => {});
    acc.socket?.end?.(undefined);
  } catch { }
  acc.socket = null;
  if (wipe) { try { fs.rmSync(sessionDir(waSessName(id)), { recursive: true, force: true }); } catch { } }
  setStatus(key, { state: "disconnected", detail: wipe ? "Unlinked and session cleared" : "Disconnected", qr: undefined, account: wipe ? undefined : status[key].account });
  return status[key];
}

export async function whatsappSend(to: string, text: string, id = "0"): Promise<{ ok: boolean; error?: string }> {
  id = normId(id);
  const key = waKey(id);
  const acc = waAcc[id];
  if (!acc.socket || status[key].state !== "connected") {
    return { ok: false, error: "WhatsApp is not connected" };
  }
  try {
    const jid = to.includes("@") ? to : `${to.replace(/\D/g, "")}@s.whatsapp.net`;
    
    // HARD ENFORCEMENT: Never send to groups, broadcasts, or newsletters under any circumstance
    if (isGroupJid(jid)) {
      emitLive("channel_message", {
        message: `WhatsApp[${id}] Outbound group message blocked (HARD RULE)`,
        detail: `Blocked destination: ${jid}`,
      });
      return { ok: false, error: "BLOCKED_GROUP_REPLY: Hard rule permanently prevents sending messages to WhatsApp groups." };
    }

    // Sanitize message formatting (strip asterisks, clean bullets, clean headers)
    const cleanText = sanitizeWhatsAppReply(text);
    await acc.socket.sendMessage(jid, { text: cleanText });
    emitLive("channel_message", { message: `WhatsApp[${id}] message sent to ${jid}` });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Send failed" };
  }
}

export async function whatsappSendVoice(to: string, audioBuffer: Buffer, id = "0"): Promise<{ ok: boolean; error?: string }> {
  id = normId(id);
  const key = waKey(id);
  const acc = waAcc[id];
  if (!acc.socket || status[key].state !== "connected") {
    return { ok: false, error: "WhatsApp is not connected" };
  }
  try {
    const jid = to.includes("@") ? to : `${to.replace(/\D/g, "")}@s.whatsapp.net`;
    if (isGroupJid(jid)) {
      return { ok: false, error: "BLOCKED_GROUP_REPLY: Hard rule permanently prevents sending messages to WhatsApp groups." };
    }

    await acc.socket.sendMessage(jid, {
      audio: audioBuffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    });
    emitLive("channel_message", { message: `WhatsApp[${id}] Voice Note (PTT) sent to ${jid}` });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Voice send failed" };
  }
}

export function whatsappHasSession(id = "0"): boolean {
  try {
    return fs.readdirSync(sessionDir(waSessName(normId(id)))).some((f) => f.startsWith("creds"));
  } catch { return false; }
}

export function whatsappList(): WhatsAppAccount[] {
  return WA_IDS.map((id) => ({
    id,
    status: status[waKey(id)],
    hasSession: whatsappHasSession(id),
    hasKnowledge: Boolean(getWhatsappKnowledge(id).trim()),
    agentActive: getWhatsappAgentActive(id),
  }));
}

export function registerChannelRoutes(app: Express): void {
  app.get("/api/channels/live", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      channels: {
        whatsapp: { ...status.whatsapp, hasSession: whatsappHasSession() },
        discord: { ...status.discord, tokenPresent: Boolean((process.env.DISCORD_BOT_TOKEN || "").trim()) },
      },
    });
  });

  app.post("/api/channels/whatsapp/connect", async (_req: Request, res: Response) => {
    res.json({ ok: true, status: await whatsappConnect() });
  });

  app.post("/api/channels/whatsapp/disconnect", async (req: Request, res: Response) => {
    res.json({ ok: true, status: await whatsappDisconnect(Boolean(req.body?.wipe)) });
  });

  app.post("/api/channels/whatsapp/send", async (req: Request, res: Response) => {
    const { to, text } = req.body || {};
    if (!to || !text) return res.status(400).json({ ok: false, error: "`to` and `text` are required" });
    if (isGroupJid(String(to))) {
      return res.status(403).json({ ok: false, error: "BLOCKED_GROUP_REPLY: Cannot send message to WhatsApp group." });
    }
    const out = await whatsappSend(String(to), String(text));
    res.status(out.ok ? 200 : 409).json(out);
  });

  console.log("[Channels] WhatsApp (QR) ready — /api/channels/*");
}