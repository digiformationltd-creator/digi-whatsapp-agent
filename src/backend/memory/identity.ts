/**
 * Identity Resolution Module
 * Resolves WhatsApp Remote JID to a sanitized, stable Customer ID.
 * Example: '923164467464@s.whatsapp.net' or '923164467464:0@s.whatsapp.net' -> 'cust_923164467464'
 */

export function resolveCustomerId(jid: string): string {
  if (!jid) return "cust_unknown";
  
  // Strip protocol prefix (whatsapp:), device suffix (:0, :1), and domain (@s.whatsapp.net, @lid)
  const clean = jid.trim().toLowerCase().replace(/^whatsapp:/, "");
  
  // Extract the primary phone number or identifier before ':' or '@'
  const match = clean.match(/^([a-z0-9_+-]+?)(?::\d+)?(?:@[a-z0-9._-]+)?$/i);
  const identifier = match ? match[1] : clean.replace(/[^a-z0-9_]/gi, "");
  
  return `cust_${identifier || "unknown"}`;
}

export function sanitizeJid(jid: string): string {
  if (!jid) return "";
  return jid.trim().toLowerCase().replace(/^whatsapp:/, "");
}
