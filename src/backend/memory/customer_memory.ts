import { getDatabase } from "./db";

export interface CustomerProfile {
  customer_id: string;
  phone_jid: string;
  name?: string | null;
  language?: string | null;
  country?: string | null;
  business_type?: string | null;
  service_interest?: string | null;
  selected_package?: string | null;
  company_name?: string | null;
  order_number?: string | null;
  past_objections?: string | null;
  kyc_progress?: string | null;
  created_at: number;
  updated_at: number;
}

export function getOrCreateCustomer(customerId: string, phoneJid: string): CustomerProfile {
  const db = getDatabase();
  const now = Date.now();

  try {
    const selectStmt = db.prepare(`SELECT * FROM customers WHERE customer_id = ?`);
    const existing = selectStmt.get(customerId) as unknown as CustomerProfile | undefined;

    if (existing) {
      return existing;
    }

    const insertStmt = db.prepare(`
      INSERT INTO customers (
        customer_id, phone_jid, name, language, country, business_type,
        service_interest, selected_package, company_name, order_number,
        past_objections, kyc_progress, created_at, updated_at
      ) VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)
    `);
    insertStmt.run(customerId, phoneJid, now, now);

    return {
      customer_id: customerId,
      phone_jid: phoneJid,
      name: null,
      language: null,
      country: null,
      business_type: null,
      service_interest: null,
      selected_package: null,
      company_name: null,
      order_number: null,
      past_objections: null,
      kyc_progress: null,
      created_at: now,
      updated_at: now,
    };
  } catch (e: any) {
    console.error("[Memory] Error getting/creating customer:", e?.message);
    return {
      customer_id: customerId,
      phone_jid: phoneJid,
      created_at: now,
      updated_at: now,
    };
  }
}

export function updateCustomerProfile(customerId: string, patch: Partial<CustomerProfile>): void {
  if (!customerId) return;
  const db = getDatabase();
  const now = Date.now();

  const allowedFields: Array<keyof CustomerProfile> = [
    "name", "language", "country", "business_type", "service_interest",
    "selected_package", "company_name", "order_number", "past_objections", "kyc_progress"
  ];

  const updates: string[] = [];
  const values: any[] = [];

  for (const field of allowedFields) {
    if (field in patch && patch[field] !== undefined) {
      updates.push(`${String(field)} = ?`);
      values.push(patch[field]);
    }
  }

  if (updates.length === 0) return;

  updates.push("updated_at = ?");
  values.push(now);
  values.push(customerId);

  try {
    const sql = `UPDATE customers SET ${updates.join(", ")} WHERE customer_id = ?`;
    const stmt = db.prepare(sql);
    stmt.run(...values);
  } catch (e: any) {
    console.error("[Memory] Error updating customer profile:", e?.message);
  }
}

/**
 * Deterministic fast entity extractor to capture customer facts from message text
 * Runs instantly in Node without making external AI calls.
 */
export function extractCustomerFacts(customerId: string, text: string): void {
  const t = text.trim();
  if (!t) return;

  const patch: Partial<CustomerProfile> = {};

  // 1. Location / Country detection
  const lower = t.toLowerCase();
  if (/\b(pakistan|lahore|karachi|islamabad|rawalpindi|peshawar|multan|faisalabad)\b/i.test(lower)) {
    patch.country = "Pakistan";
  } else if (/\b(india|delhi|mumbai|bangalore|hyderabad|kolkata)\b/i.test(lower)) {
    patch.country = "India";
  } else if (/\b(uae|dubai|abu dhabi|sharjah)\b/i.test(lower)) {
    patch.country = "UAE";
  } else if (/\b(bangladesh|dhaka)\b/i.test(lower)) {
    patch.country = "Bangladesh";
  } else if (/\b(uk|united kingdom|london|england)\b/i.test(lower)) {
    patch.country = "UK";
  } else if (/\b(usa|united states|america)\b/i.test(lower)) {
    patch.country = "USA";
  }

  // 2. Package selection detection
  if (/\b(silver package|silver pkg|silver wala|silver lena|silver kar do)\b/i.test(lower)) {
    patch.selected_package = "Silver (£170)";
    patch.service_interest = "UK Company Formation";
  } else if (/\b(starter package|starter pkg|starter wala|starter lena)\b/i.test(lower)) {
    patch.selected_package = "Starter (£140)";
    patch.service_interest = "UK Company Formation";
  } else if (/\b(gold package|gold pkg|gold wala|gold lena)\b/i.test(lower)) {
    patch.selected_package = "Gold (£180)";
    patch.service_interest = "UK Company Formation";
  } else if (/\b(platinum package|platinum pkg|platinum wala)\b/i.test(lower)) {
    patch.selected_package = "Platinum (£200)";
    patch.service_interest = "UK Company Formation";
  } else if (/\b(us llc|usa llc|llc formation)\b/i.test(lower)) {
    patch.service_interest = "USA LLC Formation";
  } else if (/\b(website|software|app development|web development)\b/i.test(lower)) {
    patch.service_interest = "Website / Software Development";
  } else if (/\b(bank|banking|stripe|wise|payoneer|paypal)\b/i.test(lower)) {
    patch.service_interest = "Business Banking / Payment Solutions";
  }

  // 3. Name introduction detection (e.g. "My name is Ali", "Mera naam Haroon ha", "I am Ahmed")
  const nameMatch = t.match(/\b(?:my name is|mera naam|i am|this is)\s+([a-zA-Z]{3,20})\b/i);
  if (nameMatch && nameMatch[1] && !["interested", "looking", "asking", "from"].includes(nameMatch[1].toLowerCase())) {
    patch.name = nameMatch[1].trim();
  }

  // 4. Order number detection
  const orderMatch = t.match(/\b(?:order|order #|order no|order id)[:\s]*([a-zA-Z0-9_-]{4,20})\b/i);
  if (orderMatch && orderMatch[1]) {
    patch.order_number = orderMatch[1].trim();
  }

  if (Object.keys(patch).length > 0) {
    updateCustomerProfile(customerId, patch);
  }
}

export function formatCustomerProfile(customerId: string): string {
  const db = getDatabase();
  try {
    const stmt = db.prepare(`SELECT * FROM customers WHERE customer_id = ?`);
    const profile = stmt.get(customerId) as unknown as CustomerProfile | undefined;
    if (!profile) return "";

    const facts: string[] = [];
    if (profile.name) facts.push(`• Customer Name: ${profile.name}`);
    if (profile.country) facts.push(`• Location / Country: ${profile.country}`);
    if (profile.service_interest) facts.push(`• Interested Service: ${profile.service_interest}`);
    if (profile.selected_package) facts.push(`• Selected Package: ${profile.selected_package}`);
    if (profile.company_name) facts.push(`• Company Name: ${profile.company_name}`);
    if (profile.order_number) facts.push(`• Order Number: ${profile.order_number}`);
    if (profile.kyc_progress) facts.push(`• KYC / Document Status: ${profile.kyc_progress}`);

    return facts.join("\n");
  } catch (e: any) {
    console.error("[Memory] Error formatting customer profile:", e?.message);
    return "";
  }
}
