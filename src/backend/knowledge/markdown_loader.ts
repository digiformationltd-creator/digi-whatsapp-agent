import fs from "fs";
import path from "path";

export interface DynamicBusinessProfile {
  name: string;
  founder?: string;
  company_number?: string;
  address?: string;
  email?: string;
  phone?: string;
  whatsapp_link?: string;
  hours?: string;
  website?: string;
  verification_link?: string;
  highlights: string[];
}

function safeModuleDir(): string {
  try {
    if (typeof __dirname !== "undefined" && __dirname) return __dirname;
  } catch {}
  return process.cwd();
}

export class MarkdownKnowledgeLoader {
  static getKnowledgeDir(): string {
    const custom = process.env.KNOWLEDGE_DIR;
    if (custom && fs.existsSync(custom)) return custom;

    const modDir = safeModuleDir();
    const candidates = [
      process.env.MYRAA_DATA_DIR ? path.join(process.env.MYRAA_DATA_DIR, "knowledge") : null,
      process.env.DIGI_DATA_DIR ? path.join(process.env.DIGI_DATA_DIR, "knowledge") : null,
      (process as any).resourcesPath ? path.join((process as any).resourcesPath, "knowledge") : null,
      path.join(process.cwd(), "knowledge"),
      path.join(process.cwd(), "data", "knowledge"),
      path.join(modDir, "..", "..", "..", "knowledge"),
      path.join(modDir, "..", "knowledge"),
    ].filter(Boolean) as string[];

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }

    return path.join(process.cwd(), "knowledge");
  }

  /**
   * Lists all available .md knowledge files in the knowledge directory
   */
  static listKnowledgeFiles(): string[] {
    const files = new Set<string>();
    try {
      const dir = this.getKnowledgeDir();
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).filter(f => f.endsWith(".md")).forEach(f => files.add(f));
      }
    } catch {}

    const waKbCandidates = [
      process.env.MYRAA_DATA_DIR ? path.join(process.env.MYRAA_DATA_DIR, "whatsapp_knowledge.md") : null,
      path.join(process.cwd(), "data", "whatsapp_knowledge.md"),
      path.join(process.cwd(), "whatsapp_knowledge.md"),
    ].filter(Boolean) as string[];

    for (const cand of waKbCandidates) {
      if (fs.existsSync(cand)) {
        files.add("whatsapp_knowledge.md");
        break;
      }
    }

    return Array.from(files);
  }

  /**
   * Reads a specific domain file directly from disk
   */
  static readDomainFile(filename: string): string {
    try {
      const dir = this.getKnowledgeDir();
      const primaryPath = path.join(dir, filename);
      if (fs.existsSync(primaryPath)) {
        return fs.readFileSync(primaryPath, "utf-8").trim();
      }

      const fallbacks = [
        process.env.MYRAA_DATA_DIR ? path.join(process.env.MYRAA_DATA_DIR, filename) : null,
        path.join(process.cwd(), "data", filename),
        path.join(process.cwd(), filename),
        (process as any).resourcesPath ? path.join((process as any).resourcesPath, "data", filename) : null,
        (process as any).resourcesPath ? path.join((process as any).resourcesPath, "knowledge", filename) : null,
      ].filter(Boolean) as string[];

      for (const fb of fallbacks) {
        if (fs.existsSync(fb)) {
          return fs.readFileSync(fb, "utf-8").trim();
        }
      }
    } catch (e: any) {
      console.error(`[KnowledgeLoader] Error reading ${filename}:`, e?.message);
    }
    return "";
  }

  /**
   * Reads all knowledge files and merges them into a single string
   */
  static readAllFiles(): { filename: string; content: string }[] {
    const files = this.listKnowledgeFiles();
    return files.map(f => ({
      filename: f,
      content: this.readDomainFile(f)
    })).filter(item => item.content.length > 0);
  }

  /**
   * Extracts a structured DynamicBusinessProfile from company-profile.md or any profile markdown
   */
  static getBusinessProfile(): DynamicBusinessProfile {
    let profileMd = this.readDomainFile("company-profile.md");
    if (!profileMd) {
      profileMd = this.readDomainFile("whatsapp_knowledge.md");
    }
    const profile: DynamicBusinessProfile = {
      name: "DIGI BIZ OS",
      highlights: []
    };

    if (!profileMd) return profile;

    // Parse title (# Company Profile — Name)
    const titleMatch = profileMd.match(/^#\s+(?:Company Profile|About|Business Profile)(?:\s*—\s*|\s*-\s*|\s*:\s*)(.+)$/im);
    if (titleMatch && titleMatch[1]) {
      profile.name = titleMatch[1].trim();
    }

    // Parse key-value table rows
    const lines = profileMd.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const parts = trimmed.split("|").map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const key = parts[0].toLowerCase();
          const val = parts[1];
          if (key.includes("company name") || key.includes("business name")) profile.name = val;
          else if (key.includes("founder") || key.includes("director") || key.includes("owner")) profile.founder = val;
          else if (key.includes("registration") || key.includes("company number") || key.includes("reg #") || key.includes("reg number")) profile.company_number = val;
          else if (key.includes("address") || key.includes("location")) profile.address = val;
          else if (key.includes("email")) profile.email = val;
          else if (key.includes("phone") || key.includes("whatsapp")) profile.phone = val;
          else if (key.includes("hours") || key.includes("timings")) profile.hours = val;
          else if (key.includes("website") || key.includes("url")) profile.website = val;
          else if (key.includes("verification portal") || key.includes("kyc link")) profile.verification_link = val;
        }
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        // Trust signal / highlight bullet
        const item = trimmed.replace(/^[-*]\s+/, "").trim();
        if (item.length > 3 && !item.toLowerCase().startsWith("http")) {
          profile.highlights.push(item);
        }
      }
    }

    if (profile.phone && !profile.whatsapp_link) {
      const cleanPhone = profile.phone.replace(/[^0-9]/g, "");
      if (cleanPhone) profile.whatsapp_link = `https://wa.me/${cleanPhone}`;
    }

    return profile;
  }

  /**
   * Scoped Knowledge Loader: Loads all relevant files based on query intent
   * and guarantees foundational context (profile + pricing) is always loaded.
   */
  static loadScopedKnowledge(customerText: string): { filesLoaded: string[]; content: string } {
    const t = (customerText || "").toLowerCase().trim();
    const filesLoaded: string[] = [];
    const sections: string[] = [];

    const allFiles = this.readAllFiles();

    // If total knowledge across all files is <= 30KB, load EVERYTHING for 100% comprehensive answers
    const totalBytes = allFiles.reduce((acc, f) => acc + f.content.length, 0);
    if (totalBytes <= 30000) {
      allFiles.forEach(f => {
        filesLoaded.push(f.filename);
        sections.push(`=== FILE: ${f.filename} ===\n${f.content}`);
      });
      return {
        filesLoaded,
        content: sections.join("\n\n")
      };
    }

    // Always include core profile & pricing
    allFiles.forEach(f => {
      const fname = f.filename.toLowerCase();
      if (fname.includes("profile") || fname.includes("package") || fname.includes("pricing") || fname.includes("menu")) {
        filesLoaded.push(f.filename);
        sections.push(`=== FILE: ${f.filename} ===\n${f.content}`);
      }
    });

    // Keyword intent matching for remaining files
    allFiles.forEach(f => {
      if (filesLoaded.includes(f.filename)) return;
      const fname = f.filename.toLowerCase();
      const contentLower = f.content.toLowerCase();

      // Check if user query matches filename keywords or specific section keywords
      const words = t.split(/\s+/).filter(w => w.length > 3);
      const matchesName = words.some(w => fname.includes(w));
      const matchesContent = words.filter(w => contentLower.includes(w)).length >= 2;

      if (matchesName || matchesContent) {
        filesLoaded.push(f.filename);
        sections.push(`=== FILE: ${f.filename} ===\n${f.content}`);
      }
    });

    return {
      filesLoaded,
      content: sections.join("\n\n")
    };
  }
}
