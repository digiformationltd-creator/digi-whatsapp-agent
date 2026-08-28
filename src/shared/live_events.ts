import type { Express, Request, Response } from "express";
import type { LiveEvent, Severity, EventSpec } from "./types";

const RING_SIZE = 300;
const ring: LiveEvent[] = [];
let seq = 0;

export const EVENT_CATALOGUE: Record<string, EventSpec> = {
  task_created: { label: "Task received", severity: "active", group: "lifecycle" },
  task_queued: { label: "Queued", severity: "info", group: "lifecycle" },
  task_started: { label: "Started", severity: "active", group: "lifecycle" },
  task_completed: { label: "Completed", severity: "good", group: "lifecycle" },
  task_failed: { label: "Failed", severity: "error", group: "lifecycle" },
  task_cancelled: { label: "Cancelled", severity: "warn", group: "lifecycle" },
  duration: { label: "Duration", severity: "info", group: "lifecycle" },

  thinking: { label: "Thinking", severity: "active", group: "reasoning" },
  planning: { label: "Planning", severity: "active", group: "reasoning" },
  reasoning: { label: "Reasoning", severity: "active", group: "reasoning" },
  searching: { label: "Searching", severity: "active", group: "reasoning" },

  router_decision: { label: "Router decision", severity: "info", group: "routing" },
  provider_selected: { label: "Provider", severity: "info", group: "routing" },
  model_selected: { label: "Model", severity: "info", group: "routing" },

  tool_selected: { label: "Tool chosen", severity: "info", group: "execution" },
  tool_execution_started: { label: "Tool running", severity: "active", group: "execution" },
  tool_execution_completed: { label: "Tool done", severity: "good", group: "execution" },
  tool_execution_failed: { label: "Tool failed", severity: "error", group: "execution" },

  desktop_action_started: { label: "Desktop action", severity: "active", group: "io" },
  desktop_action_completed: { label: "Desktop done", severity: "good", group: "io" },
  browser_action: { label: "Browser", severity: "info", group: "io" },
  file_action: { label: "File", severity: "info", group: "io" },
  integration_call: { label: "Integration", severity: "info", group: "io" },
  channel_message: { label: "Channel", severity: "info", group: "io" },

  error: { label: "Error", severity: "error", group: "problem" },
  warning: { label: "Warning", severity: "warn", group: "problem" },
  blocked: { label: "Blocked", severity: "warn", group: "problem" },
};

export type EventType = keyof typeof EVENT_CATALOGUE;

const UNKNOWN: EventSpec = { label: "Event", severity: "info", group: "lifecycle" };

const STARTS = /_started$|^thinking$|^planning$|^reasoning$|^searching$/;
const ENDS = /_completed$|_failed$|^timeout$|^task_cancelled$/;

const inFlight = new Map<string, { label: string; startedAt: number }>();

const tally: Record<string, number> = {};

const TALLY_BUCKETS: [RegExp, string][] = [
  [/PowerShell|command|Python|Node\.js|Git|Clon|Pull|Push|Commit/i, "command"],
  [/file|Edited|Wrote|Deleted|Explored/i, "file"],
  [/Search/i, "search"],
  [/Brows|page/i, "page"],
  [/screen|Analyz|Read text/i, "screen check"],
  [/memory|Recall/i, "memory op"],
  [/WhatsApp|Messaging/i, "message"],
];

function bumpTally(message: string): void {
  for (const [re, singular] of TALLY_BUCKETS) {
    if (re.test(message)) {
      tally[singular] = (tally[singular] || 0) + 1;
      return;
    }
  }
  tally["tool"] = (tally["tool"] || 0) + 1;
}

export function sessionTally(): { summary: string; counts: Record<string, number> } {
  const parts = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, n]) => `${n} ${k}${n === 1 ? "" : "s"}`);
  return { summary: parts.join(" · "), counts: { ...tally } };
}

export function runningTasks(): { count: number; oldestMs: number; labels: string[] } {
  const now = Date.now();
  const rows = [...inFlight.values()];
  return {
    count: rows.length,
    oldestMs: rows.length ? now - Math.min(...rows.map((r) => r.startedAt)) : 0,
    labels: rows.map((r) => r.label),
  };
}

type Sender = (payload: string) => void;
let sink: Sender | null = null;

export function attachSink(fn: Sender): void {
  sink = fn;
}

function scrubIdentity(input: string): string {
  return input
    .replace(/\b\d{10,15}\b/g, "[phone]")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[email]")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "[key]")
    .replace(/ghp_[A-Za-z0-9]{36}/g, "[token]");
}

export interface EmitOpts {
  message?: string;
  detail?: string;
  taskId?: string;
  durationMs?: number;
}

export function emit(type: string, opts: EmitOpts = {}): LiveEvent {
  const spec = EVENT_CATALOGUE[type] || UNKNOWN;
  const ev: LiveEvent = {
    id: `e${Date.now().toString(36)}${(seq++).toString(36)}`,
    ts: Date.now(),
    type,
    label: spec.label,
    severity: spec.severity,
    group: spec.group,
    message: scrubIdentity(opts.message || spec.label),
    detail: opts.detail ? scrubIdentity(opts.detail).slice(0, 400) : undefined,
    taskId: opts.taskId,
    durationMs: opts.durationMs,
  };

  const key = ev.taskId || ev.type;
  if (STARTS.test(type)) inFlight.set(key, { label: ev.message, startedAt: ev.ts });
  else if (ENDS.test(type)) {
    inFlight.delete(key);
    if (/_completed$/.test(type)) bumpTally(ev.message);
  }

  ring.push(ev);
  if (ring.length > RING_SIZE) ring.splice(0, ring.length - RING_SIZE);

  try {
    sink?.(JSON.stringify({ event: "live", data: ev }));
  } catch { }

  return ev;
}

export async function timed<T>(
  type: string, opts: EmitOpts, fn: () => Promise<T>
): Promise<T> {
  const t0 = Date.now();
  emit(type, opts);
  try {
    const out = await fn();
    emit("duration", {
      ...opts,
      message: `${opts.message || type} finished`,
      durationMs: Date.now() - t0,
    });
    return out;
  } catch (e: any) {
    emit("error", {
      ...opts,
      message: `${opts.message || type} failed`,
      detail: e?.message,
      durationMs: Date.now() - t0,
    });
    throw e;
  }
}

export function recent(limit = 120, group?: string): LiveEvent[] {
  const rows = group && group !== "all"
    ? ring.filter((e) => e.group === group)
    : ring;
  return rows.slice(-limit).reverse();
}

export function clear(): void {
  ring.length = 0;
  inFlight.clear();
  for (const k of Object.keys(tally)) delete tally[k];
}

export function registerEventRoutes(app: Express): void {
  app.get("/api/events/catalogue", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      total: Object.keys(EVENT_CATALOGUE).length,
      groups: [...new Set(Object.values(EVENT_CATALOGUE).map((s) => s.group))],
      types: Object.entries(EVENT_CATALOGUE).map(([type, s]) => ({ type, ...s })),
    });
  });

  app.get("/api/events/recent", (req: Request, res: Response) => {
    const limit = Math.min(300, Math.max(1, Number(req.query.limit) || 120));
    res.json({
      ok: true,
      events: recent(limit, String(req.query.group || "all")),
      buffered: ring.length,
      capacity: RING_SIZE,
      running: runningTasks(),
      tally: sessionTally(),
    });
  });

  app.post("/api/events/clear", (_req: Request, res: Response) => {
    clear();
    res.json({ ok: true });
  });

  console.log(`[Events] ${Object.keys(EVENT_CATALOGUE).length} event types ready — /api/events/*`);
}