/**
 * WhatsApp CRM — The WhatsApp Sales Agent's Customer Book.
 * Matches C:\Users\user\Desktop\AGENTICSEEK\LANGHRAF\wa-crm.ts exactly.
 * 
 * Persists every interacting customer phone number, name, message count,
 * deal pipeline status (new -> engaged -> won -> lost), and sales revenue.
 */

import fs from "fs";
import path from "path";

export type WaContact = {
  number: string;
  name?: string;
  firstContact: number;
  lastContact: number;
  messages: number;
  dealStatus: "new" | "engaged" | "won" | "lost";
  saleAmount: number;
  currency: string;
  notes?: string;
};

function storeFile(): string {
  const base = process.env.MYRAA_DATA_DIR || process.env.DIGI_DATA_DIR || path.join(process.cwd(), "data");
  try {
    fs.mkdirSync(base, { recursive: true });
  } catch { }
  return path.join(base, "whatsapp_crm.json");
}

function readAll(): Record<string, WaContact> {
  try {
    return JSON.parse(fs.readFileSync(storeFile(), "utf-8")) || {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, WaContact>): void {
  try {
    fs.writeFileSync(storeFile(), JSON.stringify(map, null, 2), "utf-8");
  } catch { }
}

const digits = (s: string) => String(s || "").replace(/\D/g, "");

/**
 * Record one inbound/outbound interaction with a customer.
 * Called automatically by the agent engine on every message.
 */
export function waCrmRecordContact(number: string, name?: string): void {
  const id = digits(number);
  if (!id) return;
  const map = readAll();
  const now = Date.now();
  const existing = map[id];
  if (existing) {
    existing.lastContact = now;
    existing.messages += 1;
    if (name && !existing.name) existing.name = name;
    if (existing.dealStatus === "new" && existing.messages >= 3) existing.dealStatus = "engaged";
  } else {
    map[id] = {
      number: id,
      name,
      firstContact: now,
      lastContact: now,
      messages: 1,
      dealStatus: "new",
      saleAmount: 0,
      currency: "GBP",
    };
  }
  writeAll(map);
}

/**
 * Update a deal status, sale amount, currency, or notes.
 */
export function waCrmUpdate(number: string, patch: Partial<WaContact>): WaContact | null {
  const id = digits(number);
  const map = readAll();
  if (!map[id]) return null;
  map[id] = { ...map[id], ...patch, number: id };
  writeAll(map);
  return map[id];
}

/**
 * Returns all contacts sorted with most recently active first.
 */
export function waCrmList(): WaContact[] {
  return Object.values(readAll()).sort((a, b) => b.lastContact - a.lastContact);
}

export interface WaCrmContactRecord extends WaContact {
  jid: string;
  deal_status: "new" | "engaged" | "won" | "lost";
  deal_value: number;
}

export function waCrmListContacts(): WaCrmContactRecord[] {
  const list = waCrmList();
  return list.map((c) => ({
    ...c,
    jid: c.number.includes("@") ? c.number : `${c.number}@s.whatsapp.net`,
    deal_status: c.dealStatus,
    deal_value: c.saleAmount,
  }));
}

export function waCrmUpdateDealStatus(number: string, dealStatus: "new" | "engaged" | "won" | "lost", saleAmount?: number): WaContact | null {
  const patch: Partial<WaContact> = { dealStatus };
  if (typeof saleAmount === "number") patch.saleAmount = saleAmount;
  return waCrmUpdate(number, patch);
}

/**
 * Returns web leads and click sources (matching DIGI Biz OS web crm parity)
 */
export function waCrmGetLeadSources(): Array<{ id: string; source: string; customer: string; timestamp: number; status: string }> {
  const list = waCrmList();
  return list.slice(0, 30).map((c) => ({
    id: `lead_${c.number}`,
    source: "Website WhatsApp Widget",
    customer: c.name || `+${c.number}`,
    timestamp: c.lastContact,
    status: c.dealStatus,
  }));
}

/**
 * Returns a high-level summary of customers, deal statuses, and total revenue.
 */
export function waCrmSummary() {
  const list = waCrmList();
  const won = list.filter((c) => c.dealStatus === "won");
  const revenue = won.reduce((s, c) => s + (c.saleAmount || 0), 0);
  return {
    totalCustomers: list.length,
    engaged: list.filter((c) => c.dealStatus === "engaged").length,
    won: won.length,
    lost: list.filter((c) => c.dealStatus === "lost").length,
    revenue,
    currency: list[0]?.currency || "GBP",
    top: list.slice(0, 50),
  };
}
