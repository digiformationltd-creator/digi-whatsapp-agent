/**
 * WhatsApp Message Formatting & Sanitization
 *
 * Enforces clean, natural, professional plain-text messages.
 * Strips unnecessary markdown asterisks (*bold*, **bold**, ***bold***)
 * while preserving legitimate content and isolated mathematical symbols.
 */

export function sanitizeWhatsAppReply(raw: string): string {
  if (!raw) return "";
  let text = String(raw);

  // 1. Convert markdown bullet lists (* item, - item) to clean bullets (• item)
  text = text.replace(/^[ \t]*\*[ \t]+/gm, "• ");
  text = text.replace(/^[ \t]*-[ \t]+/gm, "• ");

  // 2. Remove markdown header symbols (### Header -> Header)
  text = text.replace(/^[ \t]*#{1,6}[ \t]+/gm, "");

  // 3. Remove backticks (`code` -> code, ```block``` -> block)
  text = text.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, "").trim());
  text = text.replace(/`([^`]+)`/g, "$1");

  // 4. Strip triple asterisks (***bold italic*** -> bold italic)
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");

  // 5. Strip double asterisks (**bold** -> bold)
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");

  // 6. Strip single asterisks (*bold/italic* -> bold/italic)
  // Matches *word* or *several words* when surrounded by word boundary, punctuation, or spaces
  // Avoids breaking arithmetic like "5 * 10" (where * has spaces on both sides with digits)
  text = text.replace(/(?<!\d\s)\*([^*\r\n]+?)\*(?!\s\d)/g, "$1");

  // 7. Strip any lingering markdown underscores for italic (_word_ -> word) if wrapped
  text = text.replace(/(?<=^|[\s(])_([^_\r\n]+?)_(?=$|[\s).,!?])/g, "$1");

  // 8. Clean up extra excessive trailing spaces per line
  text = text
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}