/**
 * WhatsApp chat memory — honest persistence of WhatsApp conversations (1:1 and groups).
 * Ported from reference implementation (LANGHRAF/wa-memory.ts) to Digi WhatsApp Agent.
 * Compatible with both SQLite and Universal JSON DB.
 */

import { getDatabase } from "./db";

let ensured = false;

function db(): any {
  const d = getDatabase();
  if (!ensured) {
    try {
      d.exec(`CREATE TABLE IF NOT EXISTS wa_chats (
        chat_jid TEXT PRIMARY KEY,
        name TEXT,
        is_group INTEGER DEFAULT 0,
        last_text TEXT,
        last_from_me INTEGER DEFAULT 0,
        last_ts INTEGER,
        msg_count INTEGER DEFAULT 0,
        resolved INTEGER DEFAULT 0,
        resolved_at INTEGER,
        updated_at INTEGER,
        last_analyzed_ts INTEGER,
        followup_signature TEXT,
        owner_decision TEXT,
        unread INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_wachats_ts ON wa_chats(last_ts);
      CREATE TABLE IF NOT EXISTS wa_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_jid TEXT NOT NULL,
        from_me INTEGER DEFAULT 0,
        text TEXT,
        ts INTEGER,
        sender TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_wamsgs_chat ON wa_messages(chat_jid, ts);
      CREATE TABLE IF NOT EXISTS wa_settings (key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE IF NOT EXISTS wa_task_decisions (
        chat_jid TEXT NOT NULL,
        task_key TEXT NOT NULL,
        title TEXT,
        decision TEXT,
        signature TEXT,
        updated_at INTEGER,
        PRIMARY KEY (chat_jid, task_key)
      );`);
      ensured = true;
    } catch {
      ensured = true;
    }
  }
  return d;
}

export type WaChatRow = {
  chat_jid: string;
  name: string;
  is_group: number;
  last_text: string;
  last_from_me: number;
  last_ts: number;
  msg_count: number;
  resolved: number;
  unread?: number;
  owner_decision?: string;
  followup_signature?: string;
};

/** Best-effort human name for a jid when none was captured. */
function jidName(jid: string, isGroup: boolean): string {
  if (isGroup) return "Group";
  const digits = String(jid).replace(/@.*/, "").replace(/\D/g, "");
  return digits ? `+${digits}` : String(jid);
}

/**
 * Record a WhatsApp message into chat memory.
 */
export function waMemoryRecord(m: {
  jid: string;
  name?: string;
  text: string;
  fromMe: boolean;
  ts?: number;
  isGroup?: boolean;
  sender?: string;
}): void {
  try {
    const jid = String(m.jid || "").trim();
    const text = String(m.text || "").trim();
    if (!jid || !text) return;
    if (jid === "status@broadcast" || jid.endsWith("@broadcast") || jid.endsWith("@newsletter")) return;
    const isGroup = m.isGroup ?? jid.endsWith("@g.us");
    if (isGroup && !waIsGroupFollowed(jid, m.name)) return;

    const ts = m.ts && m.ts > 0 ? m.ts : Date.now();
    const fromMe = m.fromMe ? 1 : 0;
    const d = db();
    const snippet = text.slice(0, 500);

    // 1) The message itself
    try {
      d.prepare("INSERT INTO wa_messages (chat_jid,from_me,text,ts,sender) VALUES (?,?,?,?,?)")
        .run(jid, fromMe, text.slice(0, 1500), ts, m.sender ? String(m.sender).slice(0, 80) : null);
    } catch { /* best-effort */ }

    // 2) The chat row
    try {
      const existing = d.prepare("SELECT chat_jid, name, last_ts FROM wa_chats WHERE chat_jid = ?").get(jid) as any;
      const name = (m.name && m.name.trim()) || existing?.name || jidName(jid, isGroup);
      if (existing) {
        if (ts >= Number(existing.last_ts || 0)) {
          d.prepare(`UPDATE wa_chats SET name=?, is_group=?, last_text=?, last_from_me=?, last_ts=?,
            msg_count=msg_count+1, resolved=CASE WHEN ?=0 THEN 0 ELSE resolved END,
            owner_decision=CASE WHEN ?=0 THEN NULL ELSE owner_decision END,
            unread=CASE WHEN ?=1 THEN 0 ELSE unread END, updated_at=? WHERE chat_jid=?`)
            .run(name, isGroup ? 1 : 0, snippet, fromMe, ts, fromMe, fromMe, fromMe, Date.now(), jid);
        } else {
          d.prepare("UPDATE wa_chats SET name=?, msg_count=msg_count+1, updated_at=? WHERE chat_jid=?")
            .run(name, Date.now(), jid);
        }
      } else {
        d.prepare(`INSERT INTO wa_chats (chat_jid,name,is_group,last_text,last_from_me,last_ts,msg_count,resolved,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?)`)
          .run(jid, name, isGroup ? 1 : 0, snippet, fromMe, ts, 1, 0, Date.now());
      }
    } catch { /* best-effort */ }
  } catch { /* best-effort */ }
}

/** Top N chats by recency (groups + 1:1), newest first. */
export function waChatMemoryTop(limit = 25): WaChatRow[] {
  try {
    const rows = db().prepare(
      "SELECT chat_jid,name,is_group,last_text,last_from_me,last_ts,msg_count,resolved,unread,owner_decision,followup_signature FROM wa_chats ORDER BY last_ts DESC LIMIT ?"
    ).all(Math.max(1, Math.min(600, limit * 2))) || [];
    return rows
      .filter((c: any) => c.is_group !== 1 || waIsGroupFollowed(c.chat_jid, c.name))
      .slice(0, Math.max(1, Math.min(300, limit))) as WaChatRow[];
  } catch {
    return [];
  }
}

/** Check if text is spam or promotional blast */
export function isSpammyMessage(text: string): boolean {
  const t = String(text || "").trim();
  if (!t) return true;
  const lower = t.toLowerCase();
  const promo = /(https?:\/\/\S+).*(unsubscribe|opt.?out)|\b(limited time|special offer|discount code|use code|promo code|click here|sign ?up now|subscribe now|join now|earn (money|from home)|work from home|forex|crypto ?(signals|pump)|casino|betting|lottery|you (have )?won|congratulations you|claim your|free entry|investment plan|loan approv|get rich)\b/i;
  if (promo.test(lower)) return true;
  const stripped = t.replace(/https?:\/\/\S+/gi, "").replace(/\bwa\.me\/\S+/gi, "").replace(/\bchat\.whatsapp\.com\/\S+/gi, "").trim();
  const hadLink = /https?:\/\/|wa\.me\/|chat\.whatsapp\.com\//i.test(t);
  if (hadLink && stripped.split(/\s+/).filter(Boolean).length <= 3) return true;
  return false;
}

/** The stored message history of one chat, oldest→newest (up to 40). */
export function waChatHistory(jid: string, limit = 40): Array<{ from_me: number; text: string; ts: number; sender?: string | null }> {
  try {
    const rows = db().prepare(
      "SELECT from_me,text,ts,sender FROM wa_messages WHERE chat_jid=? ORDER BY ts DESC, id DESC LIMIT ?"
    ).all(jid, Math.max(1, Math.min(400, limit))) as any[];
    return (rows || []).reverse();
  } catch {
    return [];
  }
}

/** One chat row (all columns) by exact jid. */
export function waChatRow(jid: string): WaChatRow | null {
  try {
    return db().prepare("SELECT * FROM wa_chats WHERE chat_jid=?").get(jid) || null;
  } catch {
    return null;
  }
}

/** Record the analysis signature so an unchanged chat isn't re-analyzed (dedup). */
export function waSetAnalyzed(jid: string, signature: string): void {
  try {
    db().prepare("UPDATE wa_chats SET last_analyzed_ts=?, followup_signature=? WHERE chat_jid=?").run(Date.now(), signature, jid);
  } catch { /* best-effort */ }
}

let _followCache: { at: number; list: Array<{ jid?: string; name?: string }> } | null = null;

export function waFollowedGroups(): Array<{ jid?: string; name?: string }> {
  if (_followCache && Date.now() - _followCache.at < 5000) return _followCache.list;
  let list: Array<{ jid?: string; name?: string }> = [];
  try {
    const r = db().prepare("SELECT value FROM wa_settings WHERE key='followed_groups'").get() as any;
    if (r?.value) list = JSON.parse(r.value);
  } catch {
    list = [];
  }
  _followCache = { at: Date.now(), list };
  return list;
}

const _norm = (x: string) => String(x || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();

export function waIsGroupFollowed(jid: string, name?: string): boolean {
  const list = waFollowedGroups();
  if (!list.length) return false;
  return list.some((g) => (g.jid && g.jid === jid) || (!g.jid && !!g.name && !!name && _norm(name) === _norm(g.name)));
}

export function waTaskDecisions(jid: string): Record<string, { decision: string; signature: string; title: string }> {
  const out: Record<string, { decision: string; signature: string; title: string }> = {};
  try {
    for (const r of db().prepare("SELECT task_key, decision, signature, title FROM wa_task_decisions WHERE chat_jid=?").all(jid) as any[]) {
      out[r.task_key] = { decision: r.decision, signature: r.signature, title: r.title };
    }
  } catch { /* best-effort */ }
  return out;
}

export function waSetTaskDecision(jid: string, taskKey: string, title: string, decision: string, signature: string): void {
  try {
    db().prepare(`INSERT INTO wa_task_decisions (chat_jid,task_key,title,decision,signature,updated_at) VALUES (?,?,?,?,?,?)
      ON CONFLICT(chat_jid,task_key) DO UPDATE SET title=excluded.title, decision=excluded.decision, signature=excluded.signature, updated_at=excluded.updated_at`)
      .run(jid, taskKey, title, decision, signature, Date.now());
  } catch { /* best-effort */ }
}

export function waPurgeUnfollowedGroups(): { chats: number; messages: number } {
  try {
    const d = db();
    let known: any[] = [];
    try { known = d.prepare("SELECT chat_jid, name FROM wa_chats WHERE is_group=1").all() as any[]; } catch { return { chats: 0, messages: 0 }; }
    const drop = known.filter((g) => !waIsGroupFollowed(g.chat_jid, g.name)).map((g) => g.chat_jid);
    let messages = 0;
    for (const j of drop) {
      try { messages += Number(d.prepare("DELETE FROM wa_messages WHERE chat_jid=?").run(j)?.changes || 0); } catch { }
      try { d.prepare("DELETE FROM wa_chats WHERE chat_jid=?").run(j); } catch { }
    }
    return { chats: drop.length, messages };
  } catch {
    return { chats: 0, messages: 0 };
  }
}
