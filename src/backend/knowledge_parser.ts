/**
 * Knowledge Base Document Parser & Normalizer
 * Supports: .md, .txt, .json, .yaml, .yml, .csv
 * Validates, parses structured data, and normalizes into clean business knowledge.
 */

export interface ParseResult {
  ok: boolean;
  normalizedText?: string;
  format?: string;
  error?: string;
  details?: {
    itemCount?: number;
    lines?: number;
  };
}

export const SUPPORTED_EXTENSIONS = ["md", "markdown", "txt", "json", "yaml", "yml", "csv"] as const;
export type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number];

/**
 * Detect format from filename or explicit format string
 */
export function detectFormat(filenameOrFormat: string): string {
  const clean = (filenameOrFormat || "").trim().toLowerCase();
  if (clean.includes(".")) {
    const ext = clean.split(".").pop() || "";
    return ext === "markdown" ? "md" : ext;
  }
  return clean === "markdown" ? "md" : clean;
}

/**
 * Simple CSV parser that handles quoted strings and comma/tab separation
 */
function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes("\t") ? "\t" : ",";

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ""));
    return values;
  };

  const headers = parseLine(lines[0]);
  if (headers.length === 0) return [];

  const records: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length === 0 || (vals.length === 1 && !vals[0])) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h || `Column ${idx + 1}`] = vals[idx] ?? "";
    });
    records.push(row);
  }
  return records;
}

/**
 * Format JSON object/array into clean, human-readable structured business text
 */
function formatJSONValue(val: any, depth = 0): string {
  const indent = "  ".repeat(depth);
  if (val === null || val === undefined) return "N/A";
  if (typeof val !== "object") return String(val);

  if (Array.isArray(val)) {
    if (val.length === 0) return "None";
    // Check if array of simple primitives
    if (val.every((item) => typeof item !== "object" || item === null)) {
      return val.join(", ");
    }
    return val
      .map((item, idx) => {
        if (typeof item === "object" && item !== null) {
          const inner = Object.entries(item)
            .map(([k, v]) => `${indent}    • ${k}: ${formatJSONValue(v, depth + 2)}`)
            .join("\n");
          return `${indent}  [Item ${idx + 1}]\n${inner}`;
        }
        return `${indent}  • ${String(item)}`;
      })
      .join("\n");
  }

  // Regular object
  const entries = Object.entries(val);
  if (entries.length === 0) return "Empty";
  return entries
    .map(([k, v]) => {
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        return `${indent}• ${k}:\n${formatJSONValue(v, depth + 1)}`;
      }
      if (Array.isArray(v)) {
        return `${indent}• ${k}:\n${formatJSONValue(v, depth + 1)}`;
      }
      return `${indent}• ${k}: ${String(v)}`;
    })
    .join("\n");
}

/**
 * Lightweight YAML parser for business knowledge documents
 */
function parseSimpleYAML(content: string): any {
  const lines = content.split(/\r?\n/);
  const root: Record<string, any> = {};
  let currentKey = "";
  let currentArray: string[] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("- ") && currentKey) {
      if (!currentArray) currentArray = [];
      currentArray.push(line.slice(2).trim().replace(/^["']|["']$/g, ""));
      root[currentKey] = currentArray;
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      currentKey = line.slice(0, colonIdx).trim().replace(/^["']|["']$/g, "");
      const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
      currentArray = null;
      if (val) {
        root[currentKey] = val;
      } else {
        root[currentKey] = {};
      }
    }
  }

  if (Object.keys(root).length === 0) {
    throw new Error("Unable to parse YAML: No valid key-value pairs found.");
  }
  return root;
}

/**
 * Main parser and normalizer
 */
export function parseAndNormalizeKnowledge(
  rawContent: string,
  filenameOrFormat: string = "md"
): ParseResult {
  const content = (rawContent || "").trim();
  if (!content) {
    return { ok: false, error: "File content is empty." };
  }

  const format = detectFormat(filenameOrFormat);

  if (!SUPPORTED_EXTENSIONS.includes(format as SupportedExtension)) {
    return {
      ok: false,
      error: `Unsupported file format '.${format}'. Supported formats are: ${SUPPORTED_EXTENSIONS.join(", ").toUpperCase()}`,
    };
  }

  try {
    switch (format) {
      case "json": {
        let parsed: any;
        try {
          parsed = JSON.parse(content);
        } catch (err: any) {
          return { ok: false, error: `Invalid JSON syntax: ${err?.message || "Parsing failed"}` };
        }

        let normalized = "";
        let count = 0;

        if (Array.isArray(parsed)) {
          count = parsed.length;
          normalized = `# Business Knowledge Base (Imported from JSON Array - ${count} records)\n\n` +
            parsed
              .map((item, idx) => {
                if (typeof item === "object" && item !== null) {
                  const title = item.name || item.title || item.product || item.service || item.id || `Entry ${idx + 1}`;
                  const fields = Object.entries(item)
                    .filter(([k]) => !["name", "title", "product", "service"].includes(k))
                    .map(([k, v]) => `• ${k}: ${formatJSONValue(v, 1)}`)
                    .join("\n");
                  return `### ${title}\n${fields}`;
                }
                return `• ${String(item)}`;
              })
              .join("\n\n");
        } else if (typeof parsed === "object" && parsed !== null) {
          count = Object.keys(parsed).length;
          normalized = `# Business Knowledge Base (Imported from JSON Object)\n\n` +
            Object.entries(parsed)
              .map(([section, data]) => {
                return `## ${section.toUpperCase()}\n${formatJSONValue(data, 0)}`;
              })
              .join("\n\n");
        } else {
          normalized = String(parsed);
        }

        return {
          ok: true,
          format: "json",
          normalizedText: normalized,
          details: { itemCount: count, lines: normalized.split("\n").length },
        };
      }

      case "csv": {
        const records = parseCSV(content);
        if (records.length === 0) {
          return { ok: false, error: "CSV file has no readable data rows." };
        }

        const normalized = `# Business Knowledge Base (Imported from CSV - ${records.length} records)\n\n` +
          records
            .map((rec, idx) => {
              const title = rec.name || rec.title || rec.product || rec.service || rec.Item || rec.Product || `Item ${idx + 1}`;
              const rows = Object.entries(rec)
                .filter(([k]) => !["name", "title", "product", "service"].includes(k.toLowerCase()))
                .map(([k, v]) => `• ${k}: ${v}`)
                .join("\n");
              return `### ${title}\n${rows}`;
            })
            .join("\n\n");

        return {
          ok: true,
          format: "csv",
          normalizedText: normalized,
          details: { itemCount: records.length, lines: normalized.split("\n").length },
        };
      }

      case "yaml":
      case "yml": {
        let parsed: any;
        try {
          parsed = parseSimpleYAML(content);
        } catch (err: any) {
          return { ok: false, error: `Invalid YAML format: ${err?.message || "Parsing failed"}` };
        }

        const normalized = `# Business Knowledge Base (Imported from YAML)\n\n` +
          Object.entries(parsed)
            .map(([section, data]) => {
              return `## ${section.toUpperCase()}\n${formatJSONValue(data, 0)}`;
            })
            .join("\n\n");

        return {
          ok: true,
          format: "yaml",
          normalizedText: normalized,
          details: { lines: normalized.split("\n").length },
        };
      }

      case "txt": {
        const normalized = content;
        return {
          ok: true,
          format: "txt",
          normalizedText: normalized,
          details: { lines: normalized.split("\n").length },
        };
      }

      case "md":
      default: {
        const normalized = content;
        return {
          ok: true,
          format: "md",
          normalizedText: normalized,
          details: { lines: normalized.split("\n").length },
        };
      }
    }
  } catch (e: any) {
    return { ok: false, error: `Error parsing document: ${e?.message || "Unknown error"}` };
  }
}
