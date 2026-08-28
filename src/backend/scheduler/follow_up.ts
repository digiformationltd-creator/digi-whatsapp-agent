import { getDatabase } from "../memory/db";
import { CustomerState } from "../state/types";

export interface StaleLead {
  customer_id: string;
  phone_jid: string;
  stage: string;
  selected_package?: string;
  hours_inactive: number;
}

export class FollowUpScheduler {
  /**
   * Scans for leads that have been inactive for more than N hours in an active sales stage
   */
  static getStaleLeads(minHoursInactive = 24): StaleLead[] {
    const db = getDatabase();
    const thresholdMs = Date.now() - minHoursInactive * 3600 * 1000;

    try {
      const stmt = db.prepare(`
        SELECT customer_id, phone_jid, stage, selected_package, last_interaction_ts
        FROM customer_states
        WHERE stage IN ('PACKAGE_SELECTED', 'ORDER_INITIATED', 'DOCUMENTS_PENDING', 'DOCUMENTS_PARTIAL')
          AND last_interaction_ts < ?
      `);

      const rows = stmt.all(thresholdMs) as any[];
      return rows.map((r) => ({
        customer_id: r.customer_id,
        phone_jid: r.phone_jid,
        stage: r.stage,
        selected_package: r.selected_package,
        hours_inactive: Math.round((Date.now() - r.last_interaction_ts) / (3600 * 1000)),
      }));
    } catch (e: any) {
      console.error("[FollowUpScheduler] Error fetching stale leads:", e?.message);
      return [];
    }
  }

  static generateFollowUpMessage(lead: StaleLead): string {
    if (lead.stage === "PACKAGE_SELECTED") {
      return (
        `Salam! Umeed hai aap khairiyat se honge. Aap ne ${lead.selected_package || "UK LTD"} package select kiya tha.\n\n` +
        `Kya aap company registration process shuru karwana chahte hain? Bas apna preferred company name reply kar dein, hum foran order submit kar denge. 😊`
      );
    }

    if (lead.stage === "DOCUMENTS_PENDING" || lead.stage === "DOCUMENTS_PARTIAL") {
      return (
        `Salam! Aap ki UK company registration process me documents pending hain.\n\n` +
        `Kya aap ko ID verification link ya document checklist dobara chahiye? Hum help karne ke liye available hain.`
      );
    }

    return `Salam! Agar aap ko company formation ke bare me mazeed koi sawal ho to hum zaroor guide karenge.`;
  }
}
