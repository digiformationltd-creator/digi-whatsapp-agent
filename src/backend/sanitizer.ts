/**
 * WhatsApp Message Formatting & Sanitization
 *
 * Enforces clean, natural, professional plain-text messages.
 * Strips unnecessary markdown asterisks (*bold*, **bold**, ***bold***),
 * removes raw document headings, and strictly scrubs leaked prompt rules or directives.
 */

// Patterns indicating leaked system prompt instructions or KB meta-headers
const PROMPT_LEAK_LINE_PATTERNS = [
  /master\s+sales\s+knowledge\s+base/i,
  /you\s+are\s+the\s+official\s+(?:whatsapp\s+)?(?:sales\s+)?assistant/i,
  /your\s+objective\s+is\s+to/i,
  /always\s+reply\s+in\s+the\s+customer['’]s\s+language/i,
  /strict\s+pricing\s+&\s+factual\s+accuracy\s+mandate/i,
  /all\s+product\s+names,\s+packages,\s+prices/i,
  /never\s+invent,\s+rename,\s+or\s+approximate/i,
  /always\s+recommend\s+the\s+designated\s+'most\s+popular'/i,
  /===+\s*(?:business\s+knowledge\s+base|sales\s+state|permanent\s+agent|objection\s+playbook|incoming\s+customer|recalled\s+customer)/i,
  /^#+\s*(?:digi\s+biz\s+os\s*[—–-]\s*)?master\s+sales\s+knowledge\s+base/i,
  /^#+\s*\d*\.?\s*sales\s+rules\s+&/i,
  /next\s+best\s+action\s*(?:directive)?:?/i,
  /objection\s+playbook\s*guidance:?/i,
  /think:\s*long\s+internal\s+reasoning/i,
  /whatsapp\s+response\s+length\s+mandate/i,
  /universal_agent_core_rules/i,
  /language\s+mandate\s*\(pakistani\s+roman\s+urdu\s+only\)/i,
];

export function sanitizeWhatsAppReply(raw: string): string {
  if (!raw) return "";
  let text = String(raw);

  // 1. Remove prompt delimiter blocks (e.g. === BUSINESS KNOWLEDGE BASE ... ===)
  text = text.replace(/===+[\s\S]*?===+/g, "");

  // 2. Filter out any lines matching prompt leak patterns
  const filteredLines = text.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    for (const pat of PROMPT_LEAK_LINE_PATTERNS) {
      if (pat.test(trimmed)) return false;
    }
    return true;
  });
  text = filteredLines.join("\n");

  // 3. Convert markdown bullet lists (* item, - item) to clean bullets (• item)
  text = text.replace(/^[ \t]*\*[ \t]+/gm, "• ");
  text = text.replace(/^[ \t]*-[ \t]+/gm, "• ");

  // 4. Remove markdown header symbols (### Header -> Header)
  text = text.replace(/^[ \t]*#{1,6}[ \t]+/gm, "");

  // 5. Remove backticks (`code` -> code, ```block``` -> block)
  text = text.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, "").trim());
  text = text.replace(/`([^`]+)`/g, "$1");

  // 6. Strip triple asterisks (***bold italic*** -> bold italic)
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");

  // 7. Strip double asterisks (**bold** -> bold)
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");

  // 8. Strip single asterisks (*bold/italic* -> bold/italic)
  // Avoids breaking arithmetic like "5 * 10" (where * has spaces on both sides with digits)
  text = text.replace(/(?<!\d\s)\*([^*\r\n]+?)\*(?!\s\d)/g, "$1");

  // 9. Strip any lingering markdown underscores for italic (_word_ -> word) if wrapped
  text = text.replace(/(?<=^|[\s(])_([^_\r\n]+?)_(?=$|[\s).,!?])/g, "$1");

  // 10. Clean up extra excessive trailing spaces and empty lines
  text = text
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // 11. Safety check: If scrubbing cleared everything due to entire raw prompt leak, provide safe greeting
  if (!text || text.length < 5) {
    return "Hello! Welcome to DIGI BIZ OS. How can I help you today?";
  }

  return text;
}