/**
 * ZERO-AI DETERMINISTIC KNOWLEDGE ANSWERING ENGINE
 * Layer 12 (Deterministic Fallback / 0ms Instant Facts Layer)
 * 
 * Fully generic and business-agnostic: Dynamically derives customer-facing answers
 * directly from runtime Markdown knowledge files for ANY business (Restaurant, Real Estate,
 * E-commerce, SaaS, Corporate Agency).
 */

import { MarkdownKnowledgeLoader } from "../knowledge/markdown_loader";
import { sanitizeWhatsAppReply } from "../sanitizer";

/**
 * Parses all standard Markdown tables in a markdown string into an array of row objects
 */
function parseMarkdownTables(md: string): Array<Record<string, string>> {
  if (!md) return [];
  const lines = md.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith("|") && l.endsWith("|"));
  if (lines.length < 2) return [];

  const allRows: Array<Record<string, string>> = [];
  let currentHeaders: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawCells = lines[i].split("|").map(c => c.trim());
    const cells = rawCells.slice(1, rawCells.length - 1);

    const isSep = cells.every(c => /^[-:\s]+$/.test(c));
    if (isSep) {
      if (i > 0) {
        const prevRaw = lines[i - 1].split("|").map(c => c.trim());
        currentHeaders = prevRaw.slice(1, prevRaw.length - 1).map(h => h.toLowerCase());
      }
      continue;
    }

    // If next line is a separator line, this line is a header row, NOT data
    if (i + 1 < lines.length) {
      const nextCells = lines[i + 1].split("|").map(c => c.trim()).slice(1, -1);
      if (nextCells.length > 0 && nextCells.every(c => /^[-:\s]+$/.test(c))) {
        continue;
      }
    }

    if (currentHeaders.length > 0 && cells.length === currentHeaders.length) {
      const row: Record<string, string> = {};
      currentHeaders.forEach((h, idx) => {
        row[h] = cells[idx] || "";
      });
      allRows.push(row);
    }
  }

  return allRows;
}

/**
 * Parses a two-column key-value table (e.g., | Field | Value |)
 */
function parseKeyValueTable(md: string): Record<string, string> {
  const rows = parseMarkdownTables(md);
  const result: Record<string, string> = {};
  for (const r of rows) {
    const keys = Object.keys(r);
    if (keys.length >= 2) {
      const k = (r[keys[0]] || "").toLowerCase();
      const v = r[keys[1]] || "";
      if (k) result[k] = v;
    }
  }
  return result;
}

/**
 * Parses Q&A pairs from FAQ markdown
 */
function parseFAQEntries(md: string): Array<{ question: string; answer: string }> {
  if (!md) return [];
  const entries: Array<{ question: string; answer: string }> = [];
  
  // Format 1: **Q: ...**\nA: ...
  const regex1 = /\*\*(?:Q|Question):\s*([^\*]+)\*\*\s*\n+(?:A|Answer):\s*([^\n\r]+(?:\n(?!\*\*Q)[^\n\r]+)*)/gi;
  let match;
  while ((match = regex1.exec(md)) !== null) {
    entries.push({
      question: match[1].trim(),
      answer: match[2].trim()
    });
  }

  // Format 2: ### Question\nAnswer
  if (entries.length === 0) {
    const sections = md.split(/^###\s+/m);
    for (const sec of sections) {
      const lines = sec.trim().split("\n");
      if (lines.length >= 2) {
        entries.push({
          question: lines[0].trim(),
          answer: lines.slice(1).join("\n").trim()
        });
      }
    }
  }

  return entries;
}

/**
 * Evaluates whether a customer message can be answered deterministically from runtime knowledge files
 */
export function getDeterministicReply(customerText: string, customKb?: string): string | null {
  const t = (customerText || "").toLowerCase().trim();
  if (!t) return null;

  if (customKb) {
    const customSec = matchSectionFromKb(t, customKb);
    if (customSec) {
      return sanitizeWhatsAppReply(customSec);
    }
  }

  const profile = MarkdownKnowledgeLoader.getBusinessProfile();

  // ---------------------------------------------------------------------------
  // 1. Business Hours, Address & Company Profile Contact
  // ---------------------------------------------------------------------------
  if (/\b(office hours|business hours|timings|timing|opening hours|working hours|kab open|kab band|office address|contact details|phone number|email address|where are you located|kahan pe ho|location|contact info)\b/i.test(t)) {
    const profileMd = MarkdownKnowledgeLoader.readDomainFile("company-profile.md");
    if (profileMd || profile.name) {
      const hours = profile.hours || "Mon–Sat 9:00 AM – 8:00 PM";
      const email = profile.email || "";
      const phone = profile.phone || "";
      const addr = profile.address || "";

      if (t.includes("address") || t.includes("located") || t.includes("kahan") || t.includes("location")) {
        return sanitizeWhatsAppReply(
          `Hamara official address yeh hai:\n\n` +
          `📍 ${addr || "Main Business Center"}\n\n` +
          (email ? `Email: ${email}\n` : "") +
          (phone ? `Phone/WhatsApp: ${phone}\n\n` : "\n") +
          `Main aap ki mazeed kya madad kar sakta hu?`
        );
      }

      return sanitizeWhatsAppReply(
        `${profile.name || "Hamare"} business hours aur contact details:\n\n` +
        `• Timings: ${hours}\n` +
        (email ? `• Email: ${email}\n` : "") +
        (phone ? `• WhatsApp / Phone: ${phone}\n` : "") +
        (addr ? `• Address: ${addr}\n\n` : "\n") +
        `Aap ko kis service ya product ke baare me janna hai?`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Verification / KYC / Direct Link
  // ---------------------------------------------------------------------------
  if (/\b(verification link|didit link|selfie link|verify link|link dedo|link send|link chahiye|kyc link|portal link)\b/i.test(t)) {
    const kycMd = MarkdownKnowledgeLoader.readDomainFile("documents-kyc.md") || MarkdownKnowledgeLoader.readDomainFile("requirements.md");
    const linkMatch = kycMd.match(/https?:\/\/[^\s\)\|\*]+/i);
    const link = profile.verification_link || (linkMatch ? linkMatch[0] : "");

    if (link) {
      return sanitizeWhatsAppReply(
        `Aap apna online verification is official link se complete kar sakte hain:\n\n` +
        `👉 ${link}\n\n` +
        `Verification complete hone ke baad confirmation screenshot yahan share kar dein taake hum process shuru kar saken.`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Document Requirements & Onboarding Checklist
  // ---------------------------------------------------------------------------
  if (/\b(kyc requirements|what documents|documents required|docs required|document checklist|kya documents chahiye|documents kya honge|kia document|requirements kya|kya requirements)\b/i.test(t)) {
    const kycMd = MarkdownKnowledgeLoader.readDomainFile("documents-kyc.md") || MarkdownKnowledgeLoader.readDomainFile("requirements.md");
    if (kycMd) {
      const items = kycMd.split("\n")
        .map(l => l.trim())
        .filter(l => /^(?:\d+[\.\)]|[-*])\s+/.test(l))
        .map(l => "• " + l.replace(/^(?:\d+[\.\)]|[-*])\s+/, ""));

      if (items.length > 0) {
        return sanitizeWhatsAppReply(
          `Onboarding ke liye yeh basic documents aur requirements required hain:\n\n` +
          items.join("\n") + "\n\n" +
          `Aap ye details yahan WhatsApp par share kar sakte hain.`
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3b. How to Buy / Order Placement / Purchasing Steps
  // ---------------------------------------------------------------------------
  if (/\b(how to buy|how to order|buy kaise|order kaise|khareedna|khareedne ka tarika|purchase kaise|kese khareed|kaise khareed|payment method|account details|payment kahan|order karna hai)\b/i.test(t)) {
    const faqMd = MarkdownKnowledgeLoader.readDomainFile("faq.md");
    if (faqMd) {
      const buyFaq = parseFAQEntries(faqMd).find(f => /how do i buy|buy|order|purchase/i.test(f.question));
      if (buyFaq) {
        return sanitizeWhatsAppReply(buyFaq.answer);
      }
    }
    const kycMd = MarkdownKnowledgeLoader.readDomainFile("documents-kyc.md");
    if (kycMd) {
      const items = kycMd.split("\n")
        .map(l => l.trim())
        .filter(l => /^(?:\d+[\.\)]|[-*])\s+/.test(l))
        .map(l => "• " + l.replace(/^(?:\d+[\.\)]|[-*])\s+/, ""));

      return sanitizeWhatsAppReply(
        `DIGI BIZ OS buy karne ke liye:\n\n` +
        (items.length > 0 ? items.join("\n") + "\n\n" : "") +
        `Aap apni details aur preferred payment method share karein, hum aap ko payment details provide kar dete hain.`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Dynamic Pricing / Packages / Menu / Products Table Matching
  // ---------------------------------------------------------------------------
  const allKnowledgeFiles = MarkdownKnowledgeLoader.listKnowledgeFiles();
  
  for (const filename of allKnowledgeFiles) {
    const mdContent = MarkdownKnowledgeLoader.readDomainFile(filename);
    if (!mdContent || !mdContent.includes("|")) continue;

    const rows = parseMarkdownTables(mdContent);
    if (rows.length === 0) continue;

    // Check for specific item name in query
    for (const row of rows) {
      const keys = Object.keys(row);
      const itemName = (row[keys[0]] || "").trim();
      const price = row["price"] || row["official price"] || row["fee tier"] || row[keys[1]] || "";
      const timeline = row["timeline"] || row["delivery"] || "";
      const inclusions = row["inclusions"] || row["features & notes"] || row["notes"] || row["setup coverage"] || "";
      const isPopular = (row["most popular"] || "").includes("✓");

      if (itemName && itemName.length >= 3 && price) {
        // Skip SaaS comparison competitor items like Salesforce, Zapier, Canva unless explicitly queried
        const isComparison = /salesforce|hubspot|zapier|make|canva|hootsuite|chatgpt/i.test(itemName);
        if (isComparison && !t.includes(itemName.toLowerCase())) continue;

        const cleanItem = itemName.replace(/[^\w\s-]/g, "").toLowerCase().trim();
        const itemWords = cleanItem.split(/\s+/).filter(w => w.length > 2 && !/^(the|and|for|with|you|normally|buy|tier|package|tool|cost|module)$/i.test(w));

        const fullMatch = t.includes(cleanItem);
        const significantMatch = itemWords.length > 0 && itemWords.some(w => {
          return /lifetime|whitelabel|white-label|agency|starter|silver|gold|platinum|enterprise/i.test(w) && t.includes(w);
        });
        const matchesItem = fullMatch || significantMatch || (itemWords.length >= 2 && itemWords.filter(w => t.includes(w)).length >= 2);
        const asksForPrice = /price|cost|charges|rate|kitne|kitna|fee|pricing|package/i.test(t);

        if (matchesItem && asksForPrice && !/how to buy|order kaise|tarika|khareedna/i.test(t)) {
          return sanitizeWhatsAppReply(
            `${itemName} ka price ${price} hai${timeline ? ` (${timeline})` : ""}${isPopular ? " — Most Popular option" : ""}.\n\n` +
            (inclusions ? `Is mein yeh shamil hai:\n• ${inclusions.replace(/,/g, "\n•")}\n\n` : "\n") +
            `Kya aap is ke sath proceed karna chahenge?`
          );
        }
      }
    }

    // Check for general packages/pricing list query
    if (/\b(packages|packages list|all packages|kon kon se package|packages aur price|pricing list|rate list|menu|rates|kya packages hain|charges kya hain)\b/i.test(t)) {
      const summary = rows.slice(0, 6).map(r => {
        const keys = Object.keys(r);
        const name = r[keys[0]];
        const price = r["price"] || r["official price"] || r["fee tier"] || r[keys[1]] || "";
        const pop = (r["most popular"] || "").includes("✓") ? " (Most Popular)" : "";
        return `• ${name}: ${price}${pop}`;
      }).join("\n");

      if (summary) {
        return sanitizeWhatsAppReply(
          `Hamari primary pricing aur options yeh hain:\n\n` +
          `${summary}\n\n` +
          `Aap kaun sa package ya option select karna chahenge?`
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Dynamic Services Overview
  // ---------------------------------------------------------------------------
  if (/\b(what services do you offer|what do you offer|services overview|kya services hain|aap kya karte ho|kya kam karte ho|services kya hain)\b/i.test(t)) {
    const srvMd = MarkdownKnowledgeLoader.readDomainFile("services.md") || MarkdownKnowledgeLoader.readDomainFile("menu.md");
    if (srvMd) {
      const items = srvMd.split("\n")
        .map(l => l.trim())
        .filter(l => /^(?:\d+[\.\)]|[-*])\s+/.test(l))
        .map(l => "• " + l.replace(/^(?:\d+[\.\)]|[-*])\s+/, ""));

      if (items.length > 0) {
        return sanitizeWhatsAppReply(
          `${profile.name || "Hamari"} core services:\n\n` +
          items.join("\n") + "\n\n" +
          `Main aap ki kis service me madad kar sakta hu?`
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Dynamic FAQ Matching
  // ---------------------------------------------------------------------------
  const faqMd = MarkdownKnowledgeLoader.readDomainFile("faq.md");
  if (faqMd) {
    const faqs = parseFAQEntries(faqMd);
    for (const faq of faqs) {
      const qWords = faq.question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matchCount = qWords.filter(w => t.includes(w)).length;

      if (matchCount >= 2 || (qWords.length === 1 && matchCount === 1)) {
        return sanitizeWhatsAppReply(faq.answer);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Trust & Legitimacy Verification
  // ---------------------------------------------------------------------------
  if (/\b(are you real|registered company|legitimate|fake to nahi|proof do|trust|safe hai)\b/i.test(t)) {
    const highlights = profile.highlights.length > 0 ? profile.highlights.map(h => `• ${h}`).join("\n") : "";
    return sanitizeWhatsAppReply(
      `Ji bilkul! ${profile.name || "Hamari company"} fully verified aur officially registered entity hai:\n\n` +
      (profile.company_number ? `• Registration #: ${profile.company_number}\n` : "") +
      (profile.address ? `• Corporate Address: ${profile.address}\n` : "") +
      (highlights ? `${highlights}\n\n` : "\n") +
      `Aap be-fikar ho kar rabta kar sakte hain. Main aap ki kis service me madad kar sakta hu?`
    );
  }

  // ---------------------------------------------------------------------------
  // 8. General Knowledge Markdown Section Matching (LANGHRAF reference engine)
  // ---------------------------------------------------------------------------
  const allFiles = MarkdownKnowledgeLoader.readAllFiles();
  const allKb = allFiles.map(f => f.content).join("\n\n");
  if (allKb && t.length >= 4) {
    const sectionReply = matchSectionFromKb(t, allKb);
    if (sectionReply) {
      return sanitizeWhatsAppReply(sectionReply);
    }
  }

  return null;
}

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "am", "was", "were", "be", "to", "of", "for",
  "and", "or", "in", "on", "at", "it", "this", "that", "i", "you", "we", "my",
  "your", "me", "do", "does", "can", "could", "would", "will", "what", "how",
  "please", "hi", "hello", "hey", "ok", "okay",
  "hai", "ho", "ka", "ki", "ke", "ko", "se", "me", "mein", "kya", "kia",
  "aap", "ap", "mujhe", "muje", "kar", "karo", "kaise", "kitna", "kitne", "hain",
]);

function stemWord(w: string): string {
  let x = w;
  if (x.length > 4 && x.endsWith("es")) x = x.slice(0, -2);
  else if (x.length > 3 && x.endsWith("s")) x = x.slice(0, -1);
  if (x.length > 4 && x.endsWith("ing")) x = x.slice(0, -3);
  if (x.length > 3 && x.endsWith("e")) x = x.slice(0, -1);
  return x;
}

function tokenizeText(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9؀-ۿ]+/gi) || [])
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w))
    .map(stemWord);
}

export function matchSectionFromKb(customerQuery: string, kbText: string): string | null {
  const qTokens = tokenizeText(customerQuery);
  if (qTokens.length < 2) return null; // Only match multi-word queries for section fallback
  const qSet = new Set(qTokens);

  const lines = kbText.split(/\r?\n/);
  const sections: Array<{ heading: string; body: string; tokens: Set<string> }> = [];
  let heading = "";
  let buf: string[] = [];

  const flush = () => {
    const body = buf.join("\n").trim();
    if (heading && body && !/instructions?|rules?|system prompt/i.test(heading)) {
      sections.push({
        heading,
        body,
        tokens: new Set(tokenizeText(`${heading} ${body}`))
      });
    }
    buf = [];
  };

  for (const line of lines) {
    const h = line.match(/^\s*#{1,4}\s+(.*)$/);
    if (h) {
      flush();
      heading = h[1].trim();
    } else {
      buf.push(line);
    }
  }
  flush();

  let best: { heading: string; body: string; score: number } | null = null;
  for (const s of sections) {
    let overlap = 0;
    for (const t of qSet) {
      if (s.tokens.has(t)) overlap++;
    }
    const hTokens = new Set(tokenizeText(s.heading));
    let hOverlap = 0;
    for (const t of qSet) {
      if (hTokens.has(t)) hOverlap++;
    }
    const score = overlap + hOverlap * 2;
    if (score >= 3 && (!best || score > best.score)) {
      best = { heading: s.heading, body: s.body, score };
    }
  }

  if (best && best.body) {
    const out = `${best.heading}\n${best.body}`;
    return out.length > 600 ? out.slice(0, 580) + "…" : out;
  }
  return null;
}
