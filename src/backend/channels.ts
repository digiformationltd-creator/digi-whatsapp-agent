import fs from "fs";
import path from "path";
import type { Express, Request, Response } from "express";
import { emit as emitLive } from "../shared/live_events";
import type { ChannelState, ChannelStatus, WhatsAppAccount, WhatsAppListResponse } from "../shared/types";
import { parseAndNormalizeKnowledge, SUPPORTED_EXTENSIONS } from "./knowledge_parser";
import { sanitizeWhatsAppReply } from "./sanitizer";

const WA_MAX = 3;
const WA_IDS = ["0", "1", "2"];

type WaAccount = { socket: any; stopping: boolean };
const waAcc: Record<string, WaAccount> = {
  "0": { socket: null, stopping: false },
  "1": { socket: null, stopping: false },
  "2": { socket: null, stopping: false },
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
  return path.join(base, id === "0" ? "whatsapp_knowledge.md" : `whatsapp_knowledge_${id}.md`);
}

export function getWhatsappKnowledge(id = "0"): string {
  try { return fs.readFileSync(knowledgeFile(id), "utf-8"); } catch { return ""; }
}

export function setWhatsappKnowledge(content: string, id = "0", filenameOrFormat = "md"): { ok: boolean; error?: string } {
  const result = parseAndNormalizeKnowledge(content, filenameOrFormat);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  fs.writeFileSync(knowledgeFile(id), String(result.normalizedText ?? ""), "utf-8");
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
  "Thanks so much for your message! 😊 Our team is on it and will get back to you very shortly with the details.";

export async function generateSalesReply(framedPrompt: string): Promise<string> {
  const clean = (framedPrompt || "").trim();
  if (!clean) return "";

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

  // 1) Groq Ultra-Fast Cloud Models (1.1s - 1.6s Response Time)
  if (groqKey) {
    const groqModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "allam-2-7b"];
    for (const model of groqModels) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: clean }],
          }),
          signal: AbortSignal.timeout(15000),
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

  // 2) OpenCode Zen Backup
  try {
    const r = await fetch("https://opencode.ai/zen/v1/chat/completions", {
      method: "POST",
      headers: zenKey ? { "Content-Type": "application/json", Authorization: `Bearer ${zenKey}` } : { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "nemotron-3-ultra-free",
        messages: [{ role: "user", content: clean }],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (r.ok) {
      const d: any = await r.json();
      const text = String(d?.choices?.[0]?.message?.content || "").trim();
      if (text && !text.toLowerCase().startsWith("error:")) {
        console.log(`[Sales Brain] Answer generated via OpenCode Zen (nemotron-3-ultra-free)`);
        return sanitizeWhatsAppReply(text);
      }
    }
  } catch (e: any) {
    console.error("[Sales Brain] OpenCode Zen error:", e?.message);
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

          const allow = (process.env.WHATSAPP_ALLOWED || "").split(",").map((s) => s.trim()).filter(Boolean);
          const allowed = allow.length === 0 || allow.some((a) => jid.includes(a));

          // Multi-format document upload for Business Knowledge Base
          const doc = msg.message.documentMessage;
          if (doc && /\.(md|markdown|txt|json|yaml|yml|csv)$/i.test(String(doc.fileName || ""))) {
            if (!allowed) continue;
            try {
              const buf = await baileys.downloadMediaMessage(msg, "buffer", {});
              const raw = Buffer.from(buf).toString("utf-8");
              const parsed = parseAndNormalizeKnowledge(raw, String(doc.fileName || "md"));
              if (parsed.ok && parsed.normalizedText) {
                fs.writeFileSync(knowledgeFile(id), parsed.normalizedText, "utf-8");
                emitLive("file_action", { message: `Knowledge Base updated via WhatsApp from ${doc.fileName}` });
                await whatsappSend(jid, `Your business knowledge base has been updated from ${doc.fileName}. I will use it to answer customer queries.`, id);
              } else {
                await whatsappSend(jid, `Could not process ${doc.fileName}: ${parsed.error || "Invalid file"}. Supported: MD, TXT, JSON, YAML, CSV.`, id);
              }
            } catch {
              await whatsappSend(jid, "Sorry, I couldn't read that file. Please send a valid MD, TXT, JSON, YAML, or CSV document.", id);
            }
            continue;
          }

          const msgContent =
            msg.message?.ephemeralMessage?.message ||
            msg.message?.viewOnceMessage?.message ||
            msg.message?.viewOnceMessageV2?.message ||
            msg.message?.documentWithCaptionMessage?.message ||
            msg.message;

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
          if (!allowed) continue;

          if (!getWhatsappAgentActive(id)) {
            rememberFact(text, "customer", `whatsapp:${jid}`, 2, "message");
            emitLive("channel_message", { message: `WhatsApp[${id}] → agent paused (no reply)`, detail: text.slice(0, 120) });
            continue;
          }

          console.log(`[WhatsApp Inbound] Message received from ${jid}: "${text}"`);
          emitLive("channel_message", { message: `WhatsApp[${id}] AI reasoning...`, detail: text.slice(0, 120) });
          
          // Phase 1 & 2: Record inbound message into Memory & State Foundation
          recordInboundMessage(jid, text);
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
            // Phase 7: AI Orchestrator (Deterministic + Scoped AI Reasoning)
            let reply = await AIOrchestrator.generateReply(text, jid, custId);
            
            if (!reply) {
              const framed = frameSalesPrompt(text, mem, id, jid);
              reply = await generateSalesReply(framed);
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