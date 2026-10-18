/**
 * Memory Foundation & State Subsystem (Phase 1 & Phase 2)
 * Combines Identity Resolution, Short-Term Rolling Window, Durable Customer Memory, and Sales Stage Machine.
 */

import { resolveCustomerId } from "./identity";
import { saveMessage, formatShortTermHistory, getRecentMessages } from "./short_term";
import {
  getOrCreateCustomer,
  extractCustomerFacts,
  formatCustomerProfile,
  updateCustomerProfile,
  type CustomerProfile,
} from "./customer_memory";
import { StateMachine } from "../state/state_machine";

export function isMemoryEnabled(): boolean {
  return process.env.ENABLE_MEMORY !== "0";
}

/**
 * Resolves JID and formats memory + state context for prompt injection
 */
export function getConversationMemory(jid: string): string {
  if (!isMemoryEnabled() || !jid) return "";

  const customerId = resolveCustomerId(jid);
  const stateContext = StateMachine.formatStateContext(customerId, jid);
  const profileFacts = formatCustomerProfile(customerId);
  const shortTerm = formatShortTermHistory(customerId, 8);

  const sections: string[] = [];

  if (stateContext) {
    sections.push(stateContext);
  }

  if (profileFacts) {
    sections.push(`=== WHAT YOU REMEMBER ABOUT THIS CUSTOMER ===\n${profileFacts}`);
  }

  if (shortTerm) {
    sections.push(`=== RECENT CONVERSATION HISTORY (Last turns) ===\n${shortTerm}`);
  }

  return sections.join("\n\n");
}

import { waMemoryRecord } from "./wa_memory";

/**
 * Records an inbound customer message, extracts facts, updates state, and saves to Short-Term history
 */
export function recordInboundMessage(jid: string, text: string, name?: string): string {
  if (!jid || !text) return "";
  const customerId = resolveCustomerId(jid);

  if (isMemoryEnabled()) {
    getOrCreateCustomer(customerId, jid);
    extractCustomerFacts(customerId, text);
    StateMachine.processInboundMessage(customerId, jid, text);
    saveMessage(customerId, "customer", text);
    try {
      waMemoryRecord({ jid, name, text, fromMe: false, ts: Date.now() });
    } catch { /* best-effort */ }
  }

  return customerId;
}

/**
 * Records an outbound assistant reply to Short-Term history
 */
export function recordOutboundMessage(jid: string, replyText: string): void {
  if (!jid || !replyText || !isMemoryEnabled()) return;
  const customerId = resolveCustomerId(jid);
  saveMessage(customerId, "assistant", replyText);
  try {
    waMemoryRecord({ jid, text: replyText, fromMe: true, ts: Date.now() });
  } catch { /* best-effort */ }
}

export {
  resolveCustomerId,
  getRecentMessages,
  updateCustomerProfile,
  type CustomerProfile,
  StateMachine,
};
