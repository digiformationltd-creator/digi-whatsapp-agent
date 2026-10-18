import fs from "fs";
import path from "path";
import { createRequire } from "module";

const esmRequire = typeof require !== "undefined"
  ? require
  : (typeof import.meta !== "undefined" && import.meta.url ? createRequire(import.meta.url) : () => null);

export interface PreparedStatement {
  get(...args: any[]): any;
  all(...args: any[]): any[];
  run(...args: any[]): { changes: number; lastInsertRowid: number };
}

export interface ISyncDatabase {
  exec(sql: string): void;
  prepare(sql: string): PreparedStatement;
}

let dbInstance: ISyncDatabase | null = null;

function getDbPath(): string {
  const base = process.env.MYRAA_DATA_DIR || process.env.DIGI_DATA_DIR || path.join(process.cwd(), "data");
  fs.mkdirSync(base, { recursive: true });
  return path.join(base, "agent_memory.db");
}

function getJsonDbPath(): string {
  const base = process.env.MYRAA_DATA_DIR || process.env.DIGI_DATA_DIR || path.join(process.cwd(), "data");
  fs.mkdirSync(base, { recursive: true });
  return path.join(base, "agent_memory.json");
}

/**
 * Universal In-Memory/Disk JSON Storage Engine
 * Used whenever node:sqlite is not available (e.g. Electron / Node < 22)
 */
class UniversalJsonDb implements ISyncDatabase {
  private data: {
    customers: Record<string, any>;
    messages: Array<any>;
    customer_states: Record<string, any>;
    state_transitions: Array<any>;
  };
  private filePath: string;
  private messageSeq = 1;
  private transitionSeq = 1;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = {
      customers: {},
      messages: [],
      customer_states: {},
      state_transitions: []
    };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw);
        this.data = {
          customers: parsed.customers || {},
          messages: parsed.messages || [],
          customer_states: parsed.customer_states || {},
          state_transitions: parsed.state_transitions || []
        };
        if (this.data.messages.length > 0) {
          this.messageSeq = Math.max(...this.data.messages.map(m => m.id || 0)) + 1;
        }
        if (this.data.state_transitions.length > 0) {
          this.transitionSeq = Math.max(...this.data.state_transitions.map(t => t.id || 0)) + 1;
        }
      }
    } catch (e: any) {
      console.warn("[UniversalDB] Note: Initializing fresh JSON database:", e?.message);
    }
  }

  private persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e: any) {
      console.error("[UniversalDB] Error persisting JSON database:", e?.message);
    }
  }

  exec(_sql: string): void {
    // No-op for CREATE TABLE / PRAGMA in JSON mode
  }

  prepare(sql: string): PreparedStatement {
    const s = sql.trim().replace(/\s+/g, " ");

    // 1. customers table
    if (/SELECT .* FROM customers WHERE customer_id = \?/i.test(s)) {
      return {
        get: (cid: string) => this.data.customers[cid] || undefined,
        all: (cid: string) => (this.data.customers[cid] ? [this.data.customers[cid]] : []),
        run: () => ({ changes: 0, lastInsertRowid: 0 })
      };
    }

    if (/INSERT INTO customers/i.test(s)) {
      return {
        get: () => undefined,
        all: () => [],
        run: (...args: any[]) => {
          const cid = args[0];
          const jid = args[1];
          const colsMatch = s.match(/customers\s*\(([^)]+)\)/i);
          const cols = colsMatch ? colsMatch[1].split(",").map(c => c.trim()) : [];
          const record: Record<string, any> = {
            customer_id: cid,
            phone_jid: jid,
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
            created_at: Date.now(),
            updated_at: Date.now()
          };
          cols.forEach((col, idx) => {
            if (idx < args.length) {
              record[col] = args[idx];
            }
          });
          this.data.customers[cid] = record;
          this.persist();
          return { changes: 1, lastInsertRowid: 0 };
        }
      };
    }

    if (/UPDATE customers SET/i.test(s)) {
      return {
        get: () => undefined,
        all: () => [],
        run: (...args: any[]) => {
          const cid = args[args.length - 1];
          if (!cid || !this.data.customers[cid]) return { changes: 0, lastInsertRowid: 0 };

          // parse fields from sql
          const setClause = s.match(/SET (.*) WHERE/i)?.[1] || "";
          const fieldNames = setClause.split(",").map(f => f.trim().split("=")[0].trim());

          fieldNames.forEach((field, i) => {
            if (i < args.length - 1) {
              this.data.customers[cid][field] = args[i];
            }
          });
          this.persist();
          return { changes: 1, lastInsertRowid: 0 };
        }
      };
    }

    // 2. customer_states table
    if (/SELECT \* FROM customer_states WHERE customer_id = \?/i.test(s)) {
      return {
        get: (cid: string) => this.data.customer_states[cid] || undefined,
        all: (cid: string) => (this.data.customer_states[cid] ? [this.data.customer_states[cid]] : []),
        run: () => ({ changes: 0, lastInsertRowid: 0 })
      };
    }

    if (/INSERT INTO customer_states/i.test(s)) {
      return {
        get: () => undefined,
        all: () => [],
        run: (cid: string, jid: string, stage: string, missing: string, collected: string, lastTs: number, cAt: number, uAt: number) => {
          this.data.customer_states[cid] = {
            customer_id: cid,
            phone_jid: jid,
            stage,
            service: null,
            selected_package: null,
            company_name: null,
            sic_code: null,
            order_number: null,
            missing_requirements: missing,
            collected_requirements: collected,
            last_interaction_ts: lastTs,
            created_at: cAt,
            updated_at: uAt
          };
          this.persist();
          return { changes: 1, lastInsertRowid: 0 };
        }
      };
    }

    if (/UPDATE customer_states SET/i.test(s)) {
      return {
        get: () => undefined,
        all: () => [],
        run: (...args: any[]) => {
          const cid = args[args.length - 1];
          if (!cid || !this.data.customer_states[cid]) return { changes: 0, lastInsertRowid: 0 };

          const setClause = s.match(/SET (.*) WHERE/i)?.[1] || "";
          const fieldNames = setClause.split(",").map(f => f.trim().split("=")[0].trim());

          fieldNames.forEach((field, i) => {
            if (i < args.length - 1) {
              this.data.customer_states[cid][field] = args[i];
            }
          });
          this.persist();
          return { changes: 1, lastInsertRowid: 0 };
        }
      };
    }

    // 3. messages table
    if (/INSERT INTO messages/i.test(s)) {
      return {
        get: () => undefined,
        all: () => [],
        run: (cid: string, role: string, content: string, createdAt: number) => {
          const record = {
            id: this.messageSeq++,
            customer_id: cid,
            role,
            content,
            created_at: createdAt
          };
          this.data.messages.push(record);
          this.persist();
          return { changes: 1, lastInsertRowid: record.id };
        }
      };
    }

    if (/SELECT.*FROM messages WHERE customer_id = \?/i.test(s)) {
      return {
        get: (cid: string) => this.data.messages.find(m => m.customer_id === cid),
        all: (cid: string, limit = 50) => {
          const matched = this.data.messages.filter(m => m.customer_id === cid);
          return matched.slice(-limit).reverse();
        },
        run: () => ({ changes: 0, lastInsertRowid: 0 })
      };
    }

    // 4. state_transitions table
    if (/INSERT INTO state_transitions/i.test(s)) {
      return {
        get: () => undefined,
        all: () => [],
        run: (cid: string, from: string, to: string, trigger: string, ts: number) => {
          const record = {
            id: this.transitionSeq++,
            customer_id: cid,
            from_stage: from,
            to_stage: to,
            trigger,
            timestamp: ts
          };
          this.data.state_transitions.push(record);
          this.persist();
          return { changes: 1, lastInsertRowid: record.id };
        }
      };
    }

    // Fallback safe prepared statement
    return {
      get: () => undefined,
      all: () => [],
      run: () => ({ changes: 0, lastInsertRowid: 0 })
    };
  }
}

export function getDatabase(): ISyncDatabase {
  if (dbInstance) return dbInstance;

  // Try native node:sqlite (Node 22+)
  try {
    // Dynamic require to prevent bundling errors in older Node / Electron environments
    const sqliteModule = esmRequire("node:sqlite") as any;
    if (sqliteModule && sqliteModule.DatabaseSync) {
      const dbPath = getDbPath();
      const nativeDb = new sqliteModule.DatabaseSync(dbPath);
      try {
        nativeDb.exec("PRAGMA journal_mode = WAL;");
        nativeDb.exec("PRAGMA synchronous = NORMAL;");
      } catch { }

      // Initialize schema
      nativeDb.exec(`
        CREATE TABLE IF NOT EXISTS customers (
          customer_id TEXT PRIMARY KEY,
          phone_jid TEXT NOT NULL,
          name TEXT,
          language TEXT,
          country TEXT,
          business_type TEXT,
          service_interest TEXT,
          selected_package TEXT,
          company_name TEXT,
          order_number TEXT,
          past_objections TEXT,
          kyc_progress TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS customer_states (
          customer_id TEXT PRIMARY KEY,
          phone_jid TEXT NOT NULL,
          stage TEXT NOT NULL,
          service TEXT,
          selected_package TEXT,
          company_name TEXT,
          sic_code TEXT,
          order_number TEXT,
          missing_requirements TEXT,
          collected_requirements TEXT,
          last_interaction_ts INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS state_transitions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id TEXT NOT NULL,
          from_stage TEXT NOT NULL,
          to_stage TEXT NOT NULL,
          trigger TEXT,
          timestamp INTEGER NOT NULL
        );
      `);

      dbInstance = nativeDb as unknown as ISyncDatabase;
      return dbInstance;
    }
  } catch (e: any) {
    console.log("[Memory DB] Native node:sqlite not available. Using robust Universal JSON database engine.");
  }

  // Fallback to Universal JSON DB
  const jsonPath = getJsonDbPath();
  dbInstance = new UniversalJsonDb(jsonPath);
  return dbInstance;
}
