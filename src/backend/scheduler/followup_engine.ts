/**
 * WhatsApp follow-up INTELLIGENCE — turns raw chat memory into actionable business follow-ups.
 * Ported from reference implementation (LANGHRAF/wa-followups.ts) to Digi WhatsApp Agent.
 *
 * Deterministic intent detection:
 *  - FACT vs INFERENCE vs UNKNOWN evidence trails
 *  - Priority classification: HIGH / MEDIUM / LOW
 *  - Deduplication via signature comparison
 */

import {
  waChatHistory,
  waChatMemoryTop,
  waChatRow,
  isSpammyMessage,
  waIsGroupFollowed,
  waTaskDecisions,
  waSetTaskDecision,
  waPurgeUnfollowedGroups,
  waSetAnalyzed,
  type WaChatRow,
} from "../memory/wa_memory";
import { waCrmListContacts } from "../crm/wa_crm";

export type Evidence = { kind: "FACT" | "INFERENCE" | "UNKNOWN"; text: string };
export type Priority = "HIGH" | "MEDIUM" | "LOW";

export type GroupTask = {
  key: string;
  title: string;
  company: string | null;
  company_number: string | null;
  requested_by: string | null;
  ask: string;
  status: "open" | "done" | "unclear";
  first_ts: number;
  last_ts: number;
  quote: string;
};

export type Followup = {
  name: string;
  is_group: boolean;
  service: string | null;
  state: string;
  priority: Priority;
  confidence: number;
  owner_question: string;
  missed: boolean;
  evidence: Evidence[];
  last_message: string;
  when: string;
  chat_jid: string;
  task?: GroupTask;
  crm_order?: { id: string; number: string; status: string } | null;
};

const SERVICES: Array<{ id: string; label: string; re: RegExp }> = [
  { id: "us_llc", label: "US LLC", re: /\b(llc|l\.l\.c|american company|us(a)? company|limited liability)\b/i },
  { id: "uk_ltd", label: "UK company formation", re: /\b(ltd|limited company|uk company|british company|company formation|register (a |my )?(company|business))\b/i },
  { id: "id_verification", label: "ID verification", re: /\b(id verification|identity verif|passport|proof of address|kyc|verify my|verification)\b/i },
  { id: "bank_account", label: "business bank account", re: /\b(bank account|business bank|virtual bank|iban|wise|payoneer)\b/i },
  { id: "payment_gateway", label: "payment gateway", re: /\b(payment gateway|stripe|merchant account|paypal setup)\b/i },
  { id: "compliance", label: "compliance / filing", re: /\b(compliance|confirmation statement|annual return|filing|accounts filing|companies house)\b/i },
  { id: "website", label: "website development", re: /\b(website|web development|web design|landing page|web site)\b/i },
  { id: "software", label: "software / AI development", re: /\b(software|mobile app|application|crm|ai (software|agent|tool)|agentic|automation system)\b/i },
];

const RE_PRICE = /\b(how much|price|prices|pricing|cost|costs|charge|charges|kitne?|kitna|rate|rates|fee|fees|package|packages|quote|quotation)\b/i;
const RE_ORDER = /\b(i want to (order|proceed|buy)|let'?s proceed|go ahead|proceed|start my|make me (an?|the)|register (my|a|an)|i'?ll take|book it|order kar|kar do|chalo (start|karo|shuru)|shuru kar|i want (this|the) (package|service|llc|company))\b/i;
const RE_PAID = /\b(i (have )?(paid|transferred)|i'?ve (paid|transferred)|payment (is )?(done|sent|made|transferred)|paid it|sent (the |you )?(the )?(payment|money|amount)|transfer(red)? (the )?(payment|money|amount)|transfer(red)? (kar )?diya|paisa? bhej|payment kar diya|bhej diya)\b/i;
const RE_DOCS = /\b((sent|sending|attached|here (are|is)|bhej diy).*(passport|documents?|docs?|id|proof|address))|((passport|cnic|utility bill|proof of address) (attach|bhej|send))\b/i;
const RE_CURRENCY = /(£|\$|€|₨|rs\.?|gbp|usd|pkr)\s?\d|\b\d{2,6}\s?(pounds|dollars|rupees|gbp|usd|pkr)\b/i;

function detectService(text: string): { id: string; label: string } | null {
  for (const s of SERVICES) if (s.re.test(text)) return { id: s.id, label: s.label };
  return null;
}

function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function crmCrossCheck(name: string, jid: string): { order?: any; invoice?: any; anyPaid: boolean; anyOrder: boolean; note: string } {
  const out: any = { anyPaid: false, anyOrder: false, note: "" };
  try {
    const contacts = waCrmListContacts();
    const contact = contacts.find((c) => c.jid === jid || (c.name && name && c.name.toLowerCase() === name.toLowerCase()));
    if (contact) {
      if (contact.deal_status === "won") {
        out.anyPaid = true;
        out.anyOrder = true;
        out.order = { label: `Deal Won (${contact.deal_value || '0'})`, status: "won" };
      } else if (contact.deal_status === "engaged") {
        out.anyOrder = true;
        out.order = { label: "Engaged Deal", status: "in_progress" };
      }
    }
  } catch {
    out.note = "CRM cross-check fallback";
  }
  return out;
}

/** Analyze ONE chat into a follow-up, or null if no meaningful action is needed. */
export function analyzeChat(jid: string): Followup | null {
  const row: any = waChatRow(jid);
  if (!row) return null;
  const history = waChatHistory(jid, 40);
  if (history.length === 0) return null;

  const convo = history.map((h) => `${h.from_me ? "US" : "THEM"}: ${h.text}`).join("\n");
  const theirText = history.filter((h) => !h.from_me).map((h) => h.text).join("\n");
  const lastInboundIdx = [...history].map((h) => h.from_me).lastIndexOf(0);
  const lastFromMe = row.last_from_me === 1;
  const missed = row.last_ts < Date.now() - 24 * 60 * 60 * 1000;
  const unread = Number(row.unread || 0);

  if (isSpammyMessage(row.last_text)) return null;

  const svc = detectService(theirText) || detectService(convo);
  const service = svc?.label || null;
  const evidence: Evidence[] = [];
  if (svc) evidence.push({ kind: "INFERENCE", text: `Customer mentioned ${svc.label} (detected from their messages).` });

  const priceAsked = RE_PRICE.test(theirText);
  const orderIntent = RE_ORDER.test(theirText);
  const paidClaim = RE_PAID.test(theirText);
  const docsSent = RE_DOCS.test(theirText);
  const weRepliedPrice = history.some((h, i) => h.from_me && i > lastInboundIdx - 6 && RE_CURRENCY.test(h.text));

  const crm = crmCrossCheck(row.name, jid);
  if (crm.anyOrder) evidence.push({ kind: "FACT", text: `CRM has a matching order: ${crm.order?.label || "order"} (status ${crm.order?.status || "?"}).` });
  else evidence.push({ kind: "FACT", text: "No matching order found in CRM." });
  if (crm.invoice) evidence.push({ kind: "FACT", text: `CRM invoice: ${crm.invoice.label} (status ${crm.invoice.status}).` });
  if (unread > 0) evidence.push({ kind: "FACT", text: `${unread} unread message(s) in this chat — not opened yet.` });

  const nm = row.name || "Customer";
  let state = "NO_ACTION", priority: Priority = "LOW", q = "", confidence = 0.5;

  const orderIncomplete = crm.order && !["completed", "complete", "delivered", "won"].includes(String(crm.order.status || "").toLowerCase());
  if (paidClaim) {
    evidence.push({ kind: "INFERENCE", text: 'Customer CLAIMS a payment ("' + String(row.last_text || "").slice(0, 60) + '").' });
    if (crm.anyPaid && orderIncomplete) {
      state = "PAID_INCOMPLETE"; priority = "HIGH"; confidence = 0.75;
      q = `Sir, ${nm}'s payment is verified in CRM, but ${service || "order"} is not marked complete. Attention needed.`;
      evidence.push({ kind: "FACT", text: `Invoice paid but order status is "${crm.order?.status}".` });
    } else if (crm.anyPaid) {
      state = "PAYMENT_CONFIRMED"; priority = "LOW"; confidence = 0.8;
      q = `${nm} said they paid${service ? " for " + service : ""} — CRM confirms paid. Looks settled.`;
      evidence.push({ kind: "FACT", text: "CRM confirms a paid status for this contact." });
    } else {
      state = "PAYMENT_CLAIMED_UNVERIFIED"; priority = "HIGH"; confidence = 0.7;
      q = `Sir, ${nm} says they've paid${service ? " for " + service : ""}, but no matching payment found in CRM. Would you like to verify?`;
      evidence.push({ kind: "UNKNOWN", text: "Payment NOT verified in CRM records." });
    }
  } else if (docsSent) {
    state = "DOCUMENTS_SUBMITTED_PENDING"; priority = "HIGH"; confidence = 0.65;
    evidence.push({ kind: "INFERENCE", text: "Customer appears to have submitted documents / ID." });
    q = `Sir, ${nm} appears to have sent documents${service ? " for " + service : ""}. Should I follow up?`;
  } else if (orderIntent && !crm.anyOrder) {
    state = "ORDER_REQUESTED_NO_RECORD"; priority = "HIGH"; confidence = 0.7;
    q = `Sir, ${nm} asked to proceed${service ? " with " + service : ""}, but no CRM order found. Should I create a deal and follow up?`;
    evidence.push({ kind: "INFERENCE", text: "Customer expressed intent to order." });
  } else if (orderIntent && crm.anyOrder && !crm.anyPaid) {
    state = "ORDER_PAYMENT_PENDING"; priority = "HIGH"; confidence = 0.75;
    q = `Sir, ${nm}'s order exists but payment is pending. Would you like me to follow up?`;
  } else if (priceAsked && !weRepliedPrice) {
    state = "PRICE_ENQUIRY_UNANSWERED"; priority = "MEDIUM"; confidence = 0.7;
    q = `Sir, ${nm} asked about ${service ? service + " pricing" : "pricing"} but no reply sent yet. Should I follow up?`;
    evidence.push({ kind: "INFERENCE", text: "Price question detected without response." });
  } else if (!lastFromMe && (row.is_group !== 1 || priceAsked || orderIntent || service || unread > 0 || String(row.last_text || "").trim().endsWith("?"))) {
    state = unread > 0 ? "UNREAD_PENDING" : "AWAITING_REPLY"; priority = "MEDIUM"; confidence = 0.6;
    q = `Sir, ${nm} messaged${service ? " about " + service : ""}: "${String(row.last_text || "").slice(0, 80)}"` +
      (unread > 0 ? ` (${unread} unread)` : "") + " and no reply sent. Follow up?";
    evidence.push({ kind: "FACT", text: "Last message from customer; awaiting reply." });
  } else {
    return null;
  }

  return {
    name: nm,
    is_group: row.is_group === 1,
    service,
    state,
    priority,
    confidence,
    owner_question: q,
    missed,
    evidence,
    last_message: row.last_text,
    when: ago(row.last_ts),
    chat_jid: jid,
  };
}

function signature(f: Followup, row: any): string {
  return `${f.service || "-"}|${f.state}|${row.last_ts}`;
}

/**
 * Scan recent chats and return meaningful follow-ups, ranked HIGH→LOW.
 */
export function scanFollowups(scan = 60, max = 25, includeDecided = false): {
  scanned: number;
  skipped_spam_or_casual: number;
  followups: Followup[];
} {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const rows = waChatMemoryTop(Math.max(scan, 300)).filter((c) => Number(c.last_ts || 0) >= weekAgo);
  const followups: Followup[] = [];
  let skipped = 0;
  const rank: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  for (const c of rows) {
    const f = analyzeChat(c.chat_jid);
    if (!f) { skipped++; continue; }
    const row: any = waChatRow(c.chat_jid);
    if (!includeDecided && row?.owner_decision && row?.followup_signature === signature(f, row)) {
      skipped++;
      continue;
    }
    followups.push(f);
  }

  followups.sort((a, b) => rank[a.priority] - rank[b.priority] || (b.confidence - a.confidence));
  return { scanned: rows.length, skipped_spam_or_casual: skipped, followups: followups.slice(0, max) };
}

export function markFollowupsShown(followups: Followup[]): void {
  try {
    for (const f of followups) {
      const row: any = waChatRow(f.chat_jid);
      if (row) waSetAnalyzed(f.chat_jid, `${f.service || "-"}|${f.state}|${row.last_ts}`);
    }
  } catch { /* best-effort */ }
}

export type TaskLlm = (system: string, user: string) => Promise<string>;
let _taskLlm: TaskLlm | null = null;
export function setGroupTaskLlm(fn: TaskLlm): void { _taskLlm = fn; }

export async function scanFollowupsDeep(scan = 60, max = 60): Promise<{
  scanned: number;
  skipped_spam_or_casual: number;
  followups: Followup[];
  groups: Array<{ name: string; open_tasks: number; done_tasks: number }>;
}> {
  try { waPurgeUnfollowedGroups(); } catch { }
  const res = scanFollowups(scan, max);
  return {
    scanned: res.scanned,
    skipped_spam_or_casual: res.skipped_spam_or_casual,
    followups: res.followups,
    groups: [],
  };
}
