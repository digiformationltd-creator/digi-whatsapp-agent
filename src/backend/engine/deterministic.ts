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
  if (lines.length < 3) return [];

  const allRows: Array<Record<string, string>> = [];
  let currentHeaders: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rawCells = line.split("|").map(c => c.trim());
    const cells = rawCells.slice(1, rawCells.length - 1);

    // Separator line (e.g. |---|---|)
    if (cells.every(c => /^[-:\s]+$/.test(c))) {
      // previous line was headers
      if (i > 0) {
        const prevRaw = lines[i - 1].split("|").map(c => c.trim());
        currentHeaders = prevRaw.slice(1, prevRaw.length - 1).map(h => h.toLowerCase());
      }
      continue;
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
export function getDeterministicReply(customerText: string): string | null {
  const t = (customerText || "").toLowerCase().trim();
  if (!t) return null;

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

      if (itemName && itemName.length >= 3) {
        const itemWords = itemName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const matchesItem = itemWords.some(w => t.includes(w));
        const asksForPrice = /price|cost|charges|rate|kitne|kya|package|menu|fee|details/i.test(t);

        if (matchesItem && asksForPrice) {
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

  return null;
}
