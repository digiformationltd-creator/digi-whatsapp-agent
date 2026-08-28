import { getDatabase } from "../memory/db";
import { CustomerState, SalesStage, StateTransitionEvent } from "./types";

export class StateMachine {
  static getCustomerState(customerId: string, phoneJid: string): CustomerState {
    const db = getDatabase();
    const now = Date.now();

    try {
      const stmt = db.prepare("SELECT * FROM customer_states WHERE customer_id = ?");
      const row = stmt.get(customerId) as any;

      if (row) {
        return {
          customer_id: row.customer_id,
          phone_jid: row.phone_jid,
          stage: row.stage as SalesStage,
          service: row.service || undefined,
          selected_package: row.selected_package || undefined,
          company_name: row.company_name || undefined,
          sic_code: row.sic_code || undefined,
          order_number: row.order_number || undefined,
          missing_requirements: row.missing_requirements ? JSON.parse(row.missing_requirements) : [],
          collected_requirements: row.collected_requirements ? JSON.parse(row.collected_requirements) : [],
          last_interaction_ts: row.last_interaction_ts,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      }

      // Initial state
      const initial: CustomerState = {
        customer_id: customerId,
        phone_jid: phoneJid,
        stage: "NEW",
        missing_requirements: ["company_name", "business_category", "id_proof", "address_proof", "selfie"],
        collected_requirements: [],
        last_interaction_ts: now,
        created_at: now,
        updated_at: now,
      };

      const insert = db.prepare(`
        INSERT INTO customer_states (
          customer_id, phone_jid, stage, service, selected_package, company_name,
          sic_code, order_number, missing_requirements, collected_requirements,
          last_interaction_ts, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?)
      `);

      insert.run(
        customerId,
        phoneJid,
        initial.stage,
        JSON.stringify(initial.missing_requirements),
        JSON.stringify(initial.collected_requirements),
        now,
        now,
        now
      );

      return initial;
    } catch (e: any) {
      console.error("[StateEngine] Error getting customer state:", e?.message);
      return {
        customer_id: customerId,
        phone_jid: phoneJid,
        stage: "NEW",
        missing_requirements: [],
        collected_requirements: [],
        last_interaction_ts: now,
        created_at: now,
        updated_at: now,
      };
    }
  }

  static transition(customerId: string, nextStage: SalesStage, trigger: string, patch: Partial<CustomerState> = {}): CustomerState {
    const db = getDatabase();
    const now = Date.now();
    const current = this.getCustomerState(customerId, patch.phone_jid || "");

    const prevStage = current.stage;
    const updated: CustomerState = {
      ...current,
      ...patch,
      stage: nextStage,
      last_interaction_ts: now,
      updated_at: now,
    };

    try {
      // Update state
      const updateStmt = db.prepare(`
        UPDATE customer_states SET
          stage = ?,
          service = ?,
          selected_package = ?,
          company_name = ?,
          sic_code = ?,
          order_number = ?,
          missing_requirements = ?,
          collected_requirements = ?,
          last_interaction_ts = ?,
          updated_at = ?
        WHERE customer_id = ?
      `);

      updateStmt.run(
        updated.stage,
        updated.service || null,
        updated.selected_package || null,
        updated.company_name || null,
        updated.sic_code || null,
        updated.order_number || null,
        JSON.stringify(updated.missing_requirements || []),
        JSON.stringify(updated.collected_requirements || []),
        now,
        now,
        customerId
      );

      // Log transition
      const logStmt = db.prepare(`
        INSERT INTO state_transitions (customer_id, from_stage, to_stage, trigger, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);
      logStmt.run(customerId, prevStage, nextStage, trigger, now);

      console.log(`[StateEngine] ${customerId}: ${prevStage} ──(${trigger})──► ${nextStage}`);
    } catch (e: any) {
      console.error("[StateEngine] Error during state transition:", e?.message);
    }

    return updated;
  }

  /**
   * Evaluates inbound message and advances sales stage deterministically
   */
  static processInboundMessage(customerId: string, phoneJid: string, text: string): CustomerState {
    const current = this.getCustomerState(customerId, phoneJid);
    const t = text.toLowerCase().trim();

    const patch: Partial<CustomerState> = {};

    // 1. Order Placed Trigger (Order Number provided)
    const orderMatch = text.match(/(?:order(?:\s*id)?|order\s*#|order\s*no)[\s:#]*([a-zA-Z0-9_-]{4,25})/i);
    if (orderMatch && orderMatch[1]) {
      patch.order_number = orderMatch[1].trim();
      return this.transition(customerId, "ORDER_INITIATED", "order_number_provided", patch);
    }

    // 2. Package Selection Trigger
    if (/\b(silver|starter|gold|platinum)\b/i.test(t) && /\b(package|pkg|chahiye|lena|kar do|select|order)\b/i.test(t)) {
      if (t.includes("silver")) patch.selected_package = "Silver (£170)";
      else if (t.includes("starter")) patch.selected_package = "Starter (£140)";
      else if (t.includes("gold")) patch.selected_package = "Gold (£180)";
      else if (t.includes("platinum")) patch.selected_package = "Platinum (£200)";

      patch.service = "UK Company Formation";
      return this.transition(customerId, "PACKAGE_SELECTED", "customer_selected_package", patch);
    }

    // 3. KYC / Documents Mention Trigger
    if (/\b(id card|passport|bill|statement|selfie|documents|docs)\b/i.test(t)) {
      if (current.stage === "ORDER_INITIATED" || current.stage === "PACKAGE_SELECTED") {
        return this.transition(customerId, "DOCUMENTS_PENDING", "kyc_requirements_discussed", patch);
      }
    }

    // 4. Greeting / Initial Inquiry Trigger
    if (current.stage === "NEW") {
      return this.transition(customerId, "GREETED", "customer_initiated_chat", patch);
    }

    if (current.stage === "GREETED" && (t.includes("price") || t.includes("charges") || t.includes("uk company") || t.includes("llc"))) {
      return this.transition(customerId, "QUALIFIED", "inquiry_details_provided", patch);
    }

    return current;
  }

  static formatStateContext(customerId: string, phoneJid: string): string {
    const state = this.getCustomerState(customerId, phoneJid);
    const lines: string[] = [
      `• Current Sales Stage: ${state.stage}`,
    ];

    if (state.selected_package) lines.push(`• Selected Package: ${state.selected_package}`);
    if (state.service) lines.push(`• Target Service: ${state.service}`);
    if (state.order_number) lines.push(`• Order ID: ${state.order_number}`);
    if (state.company_name) lines.push(`• Company Name: ${state.company_name}`);

    return `=== CUSTOMER SALES STAGE & PIPELINE STATE ===\n${lines.join("\n")}`;
  }
}
