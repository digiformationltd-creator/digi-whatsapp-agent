import { getDatabase } from "./db";

export interface MessageRecord {
  id: number;
  customer_id: string;
  role: "customer" | "assistant";
  content: string;
  created_at: number;
}

export function saveMessage(customerId: string, role: "customer" | "assistant", content: string): void {
  const clean = (content || "").trim();
  if (!customerId || !clean) return;

  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO messages (customer_id, role, content, created_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(customerId, role, clean, Date.now());
  } catch (e: any) {
    console.error("[Memory] Error saving message:", e?.message);
  }
}

export function getRecentMessages(customerId: string, limit = 8): MessageRecord[] {
  if (!customerId) return [];

  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id, customer_id, role, content, created_at
      FROM messages
      WHERE customer_id = ?
      ORDER BY id DESC
      LIMIT ?
    `);
    const rows = stmt.all(customerId, limit) as unknown as MessageRecord[];
    return rows.reverse();
  } catch (e: any) {
    console.error("[Memory] Error retrieving recent messages:", e?.message);
    return [];
  }
}

export function formatShortTermHistory(customerId: string, limit = 8): string {
  const history = getRecentMessages(customerId, limit);
  if (history.length === 0) return "";

  const lines = history.map((msg) => {
    const speaker = msg.role === "customer" ? "Customer" : "Assistant";
    return `${speaker}: ${msg.content}`;
  });

  return lines.join("\n");
}
