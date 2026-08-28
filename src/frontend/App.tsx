import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  QrCode, 
  Link2Off, 
  BookOpen, 
  Upload, 
  Save, 
  KeyRound, 
  ExternalLink, 
  Bot, 
  Activity, 
  Settings2, 
  Sparkles, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Radio, 
  Zap, 
  Plus, 
  Smartphone,
  Check,
  Search,
  Trash2,
  Edit3,
  Eye,
  ShoppingBag,
  Briefcase,
  Headphones,
  Mail,
  Phone,
  Globe,
  Share2,
  ShieldCheck,
  Building2,
  Info
} from "lucide-react";
import type { LiveEvent } from "../shared/types";

/** Brand mark — Official styled WhatsApp SVG with Glow */
const WhatsAppLogo = ({ s = 28 }: { s?: number }) => {
  const gid = "wa_grad_" + s;
  return (
    <svg width={s} height={s} viewBox="0 0 256 256" aria-hidden="true" className="shrink-0 drop-shadow-[0_0_12px_rgba(37,211,102,0.45)]">
      <defs>
        <linearGradient id={gid} x1="128" y1="8" x2="128" y2="248" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#25D366" />
          <stop offset="100%" stopColor="#128C7E" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="256" height="256" rx="58" fill={`url(#${gid})`} />
      <path fill="#FFF" d="M128 54c-40.9 0-74 33.1-74 74 0 13.1 3.4 25.4 9.4 36.1L54 202l38.9-9.2c10.3 5.6 22.1 8.8 34.7 8.8h.03C168.9 201.6 202 168.5 202 128c0-40.9-33.1-74-74-74zm0 133.2h-.02c-11.2 0-22.1-3-31.6-8.7l-2.3-1.3-23.5 5.5 5.6-22.9-1.5-2.4c-6.2-9.9-9.5-21.3-9.5-33.1 0-34.3 27.9-62.2 62.3-62.2 16.6 0 32.2 6.5 44 18.3s18.2 27.5 18.2 44.1c0 34.3-27.9 62.6-63.2 62.6z"/>
      <path fill="#FFF" d="M162.7 149.9c-1.9-1-11.3-5.6-13.1-6.2s-3-.9-4.3 1c-1.3 1.9-4.9 6.2-6 7.5-1.1 1.3-2.2 1.4-4.1.5-11.3-5.7-18.7-10.1-26.1-22.9-2-3.4 2-3.1 5.6-10.4.6-1.3.3-2.4-.2-3.3s-4.3-10.4-5.9-14.2c-1.6-3.7-3.2-3.2-4.3-3.3h-3.7c-1.3 0-3.3.5-5.1 2.4-1.7 1.9-6.6 6.5-6.6 15.8s6.8 18.3 7.7 19.6c1 1.3 13.4 20.4 32.4 28.6 12.1 5.2 16.8 5.7 22.9 4.8 3.7-.6 11.3-4.6 12.9-9.1s1.6-8.3 1.1-9.1c-.5-.9-1.8-1.4-3.7-2.3z"/>
    </svg>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────────────── */
/* BUSINESS KNOWLEDGE BASE PRESET TEMPLATES (BUSINESS FACTS ONLY)             */
/* ────────────────────────────────────────────────────────────────────────── */
const KB_TEMPLATES = [
  {
    name: "E-Commerce",
    icon: ShoppingBag,
    template: `# Company: SwiftCart E-Commerce

## Products & Pricing
- Product Alpha: $49 (Free standard delivery)
- Product Beta: $89 (Bundle deal: 2 for $150)
- Product Pro Max: $129 (Includes 1-year replacement warranty)

## Shipping & Delivery
- Standard Shipping: 2-3 business days across the country
- Express Overnight Delivery: $10 additional charge

## Return & Refund Policy
- 7-day money-back guarantee for unused items in original packaging
- Refunds processed within 3 business days of return receipt

## Payment Methods
- Cash on Delivery (COD), Bank Transfer, Credit/Debit Card`
  },
  {
    name: "Agency Services",
    icon: Briefcase,
    template: `# Company: Apex Digital Agency

## Services & Packages
- Custom Web Development: Starting at $500 (Responsive UI, SEO setup)
- AI WhatsApp Automation: Starting at $300 (Custom CRM integration)
- Digital Marketing & SEO: $400/month

## Consultation & Booking
- Free 15-minute discovery call available for all new clients
- Project kick-off within 48 hours of initial deposit`
  },
  {
    name: "Support FAQ",
    icon: Headphones,
    template: `# Customer Support Directory & FAQs

## Business Hours
- Monday to Saturday: 9:00 AM – 9:00 PM (UTC+5)
- Sunday: Closed (Emergency inquiries answered on Monday morning)

## Frequently Asked Questions
- Order Tracking: Provide your Order ID to receive live courier tracking link.
- Order Cancellation: Permitted within 24 hours of order placement.
- Contact Email: support@example.com`
  }
];

/* ────────────────────────────────────────────────────────────────────────── */
/* KNOWLEDGE BASE STUDIO                                                      */
/* ────────────────────────────────────────────────────────────────────────── */
function KnowledgeBase({ accountId = "0" }: { accountId?: string }) {
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [parseNotice, setParseNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLoaded(false);
    fetch(`/api/whatsapp/knowledge?id=${accountId}`)
      .then((r) => r.json())
      .then((d) => setText(d.text || ""))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [accountId]);

  const save = async () => {
    setSaving(true);
    setErrorNotice(null);
    try {
      const res = await fetch("/api/whatsapp/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, id: accountId, format: "md" }),
      });
      const d = await res.json();
      if (d.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setErrorNotice(d.error || "Failed to save knowledge base.");
      }
    } catch {
      setErrorNotice("Network error while saving knowledge base.");
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setParsing(true);
    setParseNotice(null);
    setErrorNotice(null);

    const filename = f.name;
    const rd = new FileReader();
    rd.onload = async () => {
      const rawContent = String(rd.result || "");
      try {
        const res = await fetch("/api/whatsapp/knowledge/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rawContent, filename }),
        });
        const d = await res.json();
        if (d.ok && d.normalizedText) {
          setText(d.normalizedText);
          setParseNotice(
            `Parsed ${filename} (${(d.format || "file").toUpperCase()}) successfully!` +
              (d.details?.itemCount ? ` ${d.details.itemCount} items normalized.` : "")
          );
          setTimeout(() => setParseNotice(null), 4000);
        } else {
          setErrorNotice(d.error || `Failed to parse ${filename}`);
        }
      } catch {
        setText(rawContent);
        setParseNotice(`Loaded ${filename} as raw text.`);
        setTimeout(() => setParseNotice(null), 3000);
      } finally {
        setParsing(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    rd.readAsText(f);
  };

  const applyTemplate = (content: string) => {
    if (text.trim() && !window.confirm("Replace current knowledge base with this business template?")) {
      return;
    }
    setText(content);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lineCount = text.trim() ? text.split("\n").length : 0;

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Business Knowledge Base Studio
              </h3>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                BUSINESS FACTS ONLY
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Upload your business knowledge (products, services, pricing, policies, FAQs). Agent &amp; safety rules are enforced separately.
            </p>
          </div>
        </div>

        {/* View Toggle & Counters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#070B0E] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab("edit")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab === "edit"
                  ? "bg-slate-800 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Edit3 size={12} /> Edit
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab === "preview"
                  ? "bg-slate-800 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Eye size={12} /> Preview
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-white/5">
            <span>{lineCount} lines</span>
            <span>•</span>
            <span>{wordCount} words</span>
          </div>
        </div>
      </div>

      {/* Supported Formats & Template Chips */}
      <div className="p-2.5 rounded-xl bg-[#06090D] border border-white/10 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap text-[10px]">
          <div className="flex items-center gap-1.5 text-slate-400 font-mono">
            <span className="text-amber-400 font-bold uppercase tracking-wider">Supported Formats:</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">MD</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">TXT</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">JSON</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">YAML</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">YML</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">CSV</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} className="text-amber-400" /> Presets:
            </span>
            {KB_TEMPLATES.map((tmpl) => {
              const Icon = tmpl.icon;
              return (
                <button
                  key={tmpl.name}
                  onClick={() => applyTemplate(tmpl.template)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900/90 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-slate-400 hover:text-amber-300 text-[10px] font-medium transition"
                >
                  <Icon size={11} />
                  {tmpl.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {parseNotice && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <Check size={14} className="text-emerald-400 shrink-0" />
          <span>{parseNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
          <XCircle size={14} className="text-rose-400 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Editor / Preview Area */}
      {activeTab === "edit" ? (
        <div className="relative group">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={18}
            placeholder={
              loaded
                ? "# Company Name & Services\n- Product A: $99 (In Stock)\n- Product B: $149\n\n## Return Policy\n7-day money-back guarantee.\n\n## FAQs\n- Where is my order? Ask customer for Order ID."
                : "Loading business knowledge base..."
            }
            className="w-full bg-[#06090D] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-slate-200 font-mono leading-relaxed resize-y min-h-[350px] lg:min-h-[520px] focus:outline-none focus:border-[#00A884] focus:ring-1 focus:ring-[#00A884]/30 placeholder-slate-600 transition"
          />
        </div>
      ) : (
        <div className="w-full bg-[#06090D] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-slate-300 font-sans leading-relaxed min-h-[350px] lg:min-h-[520px] max-h-[600px] overflow-y-auto whitespace-pre-wrap">
          {text.trim() ? (
            text
          ) : (
            <span className="text-slate-600 italic">Business Knowledge Base is currently empty.</span>
          )}
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,.txt,.json,.yaml,.yml,.csv"
            onChange={onFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={parsing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition disabled:opacity-50"
          >
            {parsing ? <Loader2 size={13} className="animate-spin text-amber-400" /> : <Upload size={13} className="text-amber-400" />}
            Upload Document (MD, TXT, JSON, YAML, CSV)
          </button>
        </div>

        <button
          onClick={save}
          disabled={saving || parsing}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition shadow-lg ${
            saved
              ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30"
              : "bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 shadow-amber-900/30"
          } disabled:opacity-50`}
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <Check size={14} className="text-white" />
          ) : (
            <Save size={14} />
          )}
          {saved ? "Saved to Memory ✓" : "Save Knowledge"}
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* SINGLE WHATSAPP CHANNEL                                                    */
/* ────────────────────────────────────────────────────────────────────────── */
function WhatsAppChannel({ accountId = "0" }: { accountId?: string }) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback((spin = true) => {
    if (spin) setLoading(true);
    fetch(`/api/whatsapp/status?id=${accountId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() =>
        setStatus({ connected: false, status: "error", message: "Failed to reach server" })
      )
      .finally(() => setLoading(false));
  }, [accountId]);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(() => fetchStatus(false), 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus]);

  const [togglingAgent, setTogglingAgent] = useState(false);
  const agentActive: boolean = status?.agentActive !== false;
  const toggleAgent = async () => {
    setTogglingAgent(true);
    setStatus((s: any) => ({ ...(s || {}), agentActive: !agentActive }));
    try {
      await fetch("/api/whatsapp/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: accountId, active: !agentActive }),
      });
    } catch {
      /* ignore */
    } finally {
      setTogglingAgent(false);
      fetchStatus(false);
    }
  };

  const connect = async () => {
    setBusy(true);
    try {
      await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: accountId }),
      });
      fetchStatus(false);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch("/api/whatsapp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: accountId }),
      });
      fetchStatus(false);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const state = status?.state || "disconnected";
  const connected = state === "connected";
  const connecting = state === "connecting";
  const qr = status?.qr || status?.status?.qr || null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ── LEFT COLUMN: Connection, Auto-Reply, QR Pairing, Engine Stats ── */}
      <div className="lg:col-span-5 space-y-5">
        {/* Device Status Card */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all ${
                  connected
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 glow-green"
                    : connecting || state === "qr_ready"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-slate-800/80 border-white/5 text-slate-500"
                }`}
              >
                {connected ? (
                  <CheckCircle2 size={24} className="text-emerald-400" />
                ) : connecting || state === "qr_ready" ? (
                  <Loader2 size={24} className="text-amber-400 animate-spin" />
                ) : (
                  <XCircle size={24} className="text-slate-500" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-extrabold tracking-tight ${
                      connected
                        ? "text-emerald-400"
                        : connecting || state === "qr_ready"
                        ? "text-amber-400"
                        : "text-slate-300"
                    }`}
                  >
                    {connected
                      ? "Device Linked & Live"
                      : state === "qr_ready"
                      ? "Ready for QR Pairing"
                      : connecting
                      ? "Initializing Session..."
                      : "Session Disconnected"}
                  </span>
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      connected ? "bg-emerald-400 animate-ping" : "bg-slate-600"
                    }`}
                  />
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {status?.phone ? (
                    <span className="font-mono text-emerald-300 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {status.phone}
                    </span>
                  ) : (
                    <span>Scan QR code with WhatsApp mobile app.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchStatus()}
                title="Refresh status"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/5 transition shadow"
              >
                <RefreshCw size={14} />
              </button>
              {connected && (
                <button
                  onClick={disconnect}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition disabled:opacity-50 shadow"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Link2Off size={13} />}
                  Unlink
                </button>
              )}
            </div>
          </div>
        </div>

        {/* AI Auto-Reply Switch */}
        <div
          className={`p-5 rounded-2xl border transition-all shadow-xl ${
            agentActive
              ? "bg-[#00A884]/10 border-[#00A884]/35 glow-teal"
              : "glass-card border-white/5"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bot size={18} className={agentActive ? "text-[#25D366]" : "text-slate-400"} />
                <span className={`text-sm font-bold ${agentActive ? "text-slate-100" : "text-slate-400"}`}>
                  AI Auto-Reply Sales Agent
                </span>
                {agentActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    24/7 ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {agentActive
                  ? "AI automatically responds to incoming customer chats using factual knowledge and sales playbooks."
                  : "Paused. The bot will not auto-reply; you can chat manually on your phone."}
              </p>
            </div>
            <button
              onClick={toggleAgent}
              disabled={togglingAgent}
              aria-pressed={agentActive}
              className={`relative shrink-0 h-6 w-11 rounded-full transition-colors mt-1 ${
                agentActive ? "bg-[#25D366]" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${
                  agentActive ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* QR Pairing Section (If Disconnected) */}
        {!connected && (
          <div className="glass-card rounded-2xl p-6 border border-white/10 flex flex-col items-center text-center space-y-4 shadow-2xl">
            {qr ? (
              <div className="space-y-4 flex flex-col items-center">
                <div className="p-3.5 bg-white rounded-2xl shadow-2xl shadow-emerald-950/60 border-4 border-[#00A884]/40 animate-pulse-subtle">
                  <img src={qr} alt="WhatsApp QR Code" className="w-60 h-60 rounded-lg" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-sm font-bold text-white">Scan with WhatsApp Mobile</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Open WhatsApp → <span className="text-slate-200 font-semibold">Settings</span> → <span className="text-slate-200 font-semibold">Linked Devices</span> → <span className="text-emerald-400 font-semibold">Link a Device</span>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 py-4 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/20 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] shadow-xl">
                  <Smartphone size={32} />
                </div>
                <h4 className="text-sm font-bold text-white pt-2">Connect WhatsApp Number</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Generate a pairing QR code to connect your personal or business WhatsApp number in seconds.
                </p>
              </div>
            )}

            {/* Ban Risk Alert */}
            <div className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-200/90 leading-snug">
                <span className="font-semibold text-amber-300">Safety Tip: </span>
                Use an established WhatsApp number. Official Baileys Web protocol keeps your connection authentic.
              </div>
            </div>

            <button
              onClick={connect}
              disabled={busy || connecting || state === "qr_ready"}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition"
            >
              {busy || connecting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <QrCode size={15} />
              )}
              {qr ? "Regenerate QR Code" : "Start & Connect WhatsApp"}
            </button>
          </div>
        )}

        {/* Engine Highlights Card */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <Zap size={14} className="text-amber-400" /> Universal Sales Engine Status
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-0.5">
              <div className="text-slate-400">Zero-AI Fallback</div>
              <div className="text-emerald-400 font-bold font-mono">0ms Active</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-0.5">
              <div className="text-slate-400">Language Mode</div>
              <div className="text-teal-300 font-bold font-mono">Roman Urdu / EN</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-0.5">
              <div className="text-slate-400">Sales Pipeline</div>
              <div className="text-amber-300 font-bold font-mono">8-Stage FSM</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-0.5">
              <div className="text-slate-400">Memory Storage</div>
              <div className="text-purple-300 font-bold font-mono">SQLite Local</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Full-Height Knowledge Base Studio ── */}
      <div className="lg:col-span-7">
        <KnowledgeBase accountId={accountId} />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* MULTI ACCOUNT CONTAINER                                                    */
/* ────────────────────────────────────────────────────────────────────────── */
function WhatsAppMulti() {
  const [accounts, setAccounts] = useState<Array<{ id: string; status: any; hasSession: boolean; hasKnowledge: boolean }>>([]);
  const [active, setActive] = useState("0");
  const [max, setMax] = useState(3);
  const [shown, setShown] = useState(1);

  const load = useCallback(() => {
    fetch("/api/whatsapp/list", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const accs = d?.accounts || [];
        setAccounts(accs);
        setMax(d?.max || 3);
        const used = accs.filter((a: any) => a.hasSession || a.hasKnowledge || a.status?.connected).length;
        setShown((s) => Math.max(1, used, s));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const label = (id: string) => `Account ${Number(id) + 1}`;
  const stateOf = (id: string) => accounts.find((a) => a.id === id)?.status?.state || "disconnected";

  return (
    <div className="space-y-6">
      {/* Account Navigation Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-slate-900/60 p-2 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          {Array.from({ length: shown }, (_, i) => String(i)).map((id) => {
            const st = stateOf(id);
            const on = st === "connected";
            const isSelected = active === id;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-gradient-to-r from-[#00A884] to-[#128C7E] text-white shadow-lg shadow-emerald-950/30"
                    : "bg-slate-950/70 border border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    on ? "bg-emerald-300 shadow-[0_0_8px_#34d399]" : "bg-slate-600"
                  }`}
                />
                {label(id)}
                {on && (
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    Live
                  </span>
                )}
              </button>
            );
          })}

          {shown < max && (
            <button
              onClick={() => {
                const n = Math.min(shown + 1, max);
                setShown(n);
                setActive(String(n - 1));
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-white/15 text-xs font-semibold text-slate-400 hover:border-[#25D366]/40 hover:text-[#25D366] bg-slate-900/30 transition"
            >
              <Plus size={14} /> Add Number Slot
            </button>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          Connected Slots: <span className="text-emerald-400 font-bold">{shown}/{max}</span>
        </div>
      </div>

      <WhatsAppChannel key={active} accountId={active} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* LIVE LOGS PANEL                                                            */
/* ────────────────────────────────────────────────────────────────────────── */
function LogsPanel() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [search, setSearch] = useState("");
  const [filterSev, setFilterSev] = useState<string>("all");

  const loadRecent = useCallback(() => {
    fetch("/api/events/recent?limit=120", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setEvents(d?.events || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRecent();
    let ws: WebSocket | null = null;
    let closed = false;
    const connectWs = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/ws/events`);
      ws.onmessage = (m) => {
        try {
          const d = JSON.parse(m.data);
          if (d?.event === "live" && d.data) {
            setEvents((prev) => [d.data as LiveEvent, ...prev].slice(0, 300));
          }
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        if (!closed) setTimeout(connectWs, 3000);
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {}
      };
    };
    connectWs();
    return () => {
      closed = true;
      try {
        ws?.close();
      } catch {}
    };
  }, [loadRecent]);

  const filteredEvents = events.filter((e) => {
    if (filterSev !== "all" && e.severity !== filterSev) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.message.toLowerCase().includes(q) ||
      e.label.toLowerCase().includes(q) ||
      (e.detail && e.detail.toLowerCase().includes(q))
    );
  });

  const sevBadge = (sev: string) => {
    switch (sev) {
      case "good":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "warn":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "error":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "active":
        return "bg-teal-500/10 text-teal-300 border-teal-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4 shadow-xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Radio size={16} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Live Activity Stream
            </h3>
            <p className="text-[11px] text-slate-400">
              Real-time incoming messages, AI generation steps, and WhatsApp events.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEvents([])}
            title="Clear current view"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200 text-[11px] transition"
          >
            <Trash2 size={12} /> Clear
          </button>
          <button
            onClick={loadRecent}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-teal-400 text-[11px] transition"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs by keyword, phone, or event..."
            className="w-full bg-[#080D11] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-[#00A884]"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#080D11] p-1 rounded-xl border border-white/10">
          {(["all", "good", "active", "warn", "error"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSev(s)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                filterSev === s
                  ? "bg-slate-800 text-white border border-white/10 shadow"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Viewport */}
      <div className="h-[360px] overflow-y-auto rounded-xl border border-white/10 bg-[#06090D] p-3 space-y-2 font-mono text-xs">
        {filteredEvents.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
            <Activity size={24} className="opacity-40" />
            <p className="text-xs">No activity captured yet. Waiting for WhatsApp messages...</p>
          </div>
        )}

        {filteredEvents.map((e) => (
          <div
            key={e.id}
            className="p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900/80 border border-white/5 transition flex items-start gap-2.5 leading-relaxed"
          >
            <span className="text-[10px] text-slate-500 shrink-0 select-none">
              {new Date(e.ts).toLocaleTimeString()}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${sevBadge(
                e.severity
              )}`}
            >
              {e.label}
            </span>
            <div className="flex-1 text-slate-300 break-words">
              {e.message}
              {e.detail && <span className="text-slate-500 block text-[11px] mt-0.5 font-sans">{e.detail}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* SETTINGS PANEL                                                             */
/* ────────────────────────────────────────────────────────────────────────── */
function SettingsPanel() {
  const [key, setKey] = useState("");
  const [hint, setHint] = useState("");
  const [set, setSet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [groqKey, setGroqKey] = useState("");
  const [groqHint, setGroqHint] = useState("");
  const [groqSet, setGroqSet] = useState(false);
  const [groqBusy, setGroqBusy] = useState(false);
  const [groqMsg, setGroqMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    fetch("/api/config/agent-key", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setSet(Boolean(d.set));
        setHint(d.hint || "");
      })
      .catch(() => {});

    fetch("/api/config/groq-key", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setGroqSet(Boolean(d.set));
        setGroqHint(d.hint || "");
      })
      .catch(() => {});
  };

  useEffect(load, []);

  const save = async (customKey?: string) => {
    setBusy(true);
    setMsg(null);
    const keyToSave = customKey !== undefined ? customKey : key.trim();
    try {
      const r = await fetch("/api/config/agent-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyToSave }),
      });
      const d = await r.json();
      setSet(Boolean(d.set));
      setMsg({
        ok: Boolean(d.ok),
        text: d.ok
          ? keyToSave
            ? "API Key saved successfully! AI replies are fully active."
            : "Key cleared. Using default free tier."
          : d.error || "Save failed",
      });
      if (d.ok) {
        setKey("");
        load();
      }
    } catch {
      setMsg({ ok: false, text: "Network error saving API key" });
    } finally {
      setBusy(false);
    }
  };

  const saveGroq = async (customKey?: string) => {
    setGroqBusy(true);
    setGroqMsg(null);
    const keyToSave = customKey !== undefined ? customKey : groqKey.trim();
    try {
      const r = await fetch("/api/config/groq-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyToSave }),
      });
      const d = await r.json();
      setGroqSet(Boolean(d.set));
      setGroqMsg({
        ok: Boolean(d.ok),
        text: d.ok
          ? keyToSave
            ? "Groq Whisper Key saved! Voice notes will transcribe instantly."
            : "Groq key cleared. Using local open-source Whisper."
          : d.error || "Save failed",
      });
      if (d.ok) {
        setGroqKey("");
        load();
      }
    } catch {
      setGroqMsg({ ok: false, text: "Network error saving Groq key" });
    } finally {
      setGroqBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* 1. OpenCode Zen AI Reasoning Engine Key */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shadow-inner">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                OpenCode Zen AI Engine Key
              </h3>
              <p className="text-[11px] text-slate-400">
                Primary free AI reasoning engine powering customer chat auto-replies.
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 text-[10px] font-mono font-bold px-3 py-1 rounded-full border ${
              set
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 glow-green"
                : "bg-slate-800 text-slate-400 border-white/5"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${set ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
            {set ? `Active (${hint})` : "Keyless Free Tier"}
          </div>
        </div>

        {/* Quick Get API Key Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#00A884]/15 via-slate-900/80 to-slate-900/80 border border-[#00A884]/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#25D366]" /> Need an OpenCode Zen API Key?
            </div>
            <p className="text-[11px] text-slate-400">
              Get your 100% free API key instantly without credit card.
            </p>
          </div>

          <a
            href="https://opencode.ai/auth"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition shrink-0"
          >
            <ExternalLink size={13} />
            Get Key Free
          </a>
        </div>

        {/* Input & Save Area */}
        <div className="p-4 rounded-xl bg-[#06090D] border border-white/10 space-y-3">
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-... Paste your OpenCode Zen API key here"
              className="flex-1 min-w-[200px] rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-[#00A884] focus:ring-1 focus:ring-[#00A884]/30 font-mono placeholder-slate-600 transition"
            />
            <button
              onClick={() => save()}
              disabled={busy || !key.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00A884] to-[#128C7E] hover:brightness-110 disabled:opacity-40 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition shrink-0"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Key
            </button>
            {set && (
              <button
                onClick={() => save("")}
                disabled={busy}
                title="Clear current key"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 px-3 py-2.5 text-xs font-semibold text-slate-400 hover:text-rose-300 transition shrink-0"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {msg && (
            <div
              className={`text-xs font-mono px-3 py-2 rounded-lg border ${
                msg.ok
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/20"
              }`}
            >
              {msg.text}
            </div>
          )}
        </div>
      </div>

      {/* 2. Groq Cloud Whisper STT Key */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Groq Cloud Whisper STT Key
              </h3>
              <p className="text-[11px] text-slate-400">
                Ultra-fast voice note audio transcription &amp; fallback brain.
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 text-[10px] font-mono font-bold px-3 py-1 rounded-full border ${
              groqSet
                ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                : "bg-slate-800 text-slate-400 border-white/5"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${groqSet ? "bg-amber-400 animate-pulse" : "bg-slate-500"}`} />
            {groqSet ? `Active (${groqHint})` : "Using Local Whisper"}
          </div>
        </div>

        {/* Quick Get Groq Key Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-slate-900/80 to-slate-900/80 border border-amber-500/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" /> Need a Free Groq Cloud Key?
            </div>
            <p className="text-[11px] text-slate-400">
              Free sub-second speech-to-text audio transcribing.
            </p>
          </div>

          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 text-xs font-bold shadow-lg shadow-amber-950/40 transition shrink-0"
          >
            <ExternalLink size={13} />
            Get Groq Key
          </a>
        </div>

        {/* Input & Save Area */}
        <div className="p-4 rounded-xl bg-[#06090D] border border-white/10 space-y-3">
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_... Paste your Groq API key here"
              className="flex-1 min-w-[200px] rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 font-mono placeholder-slate-600 transition"
            />
            <button
              onClick={() => saveGroq()}
              disabled={groqBusy || !groqKey.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 disabled:opacity-40 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition shrink-0"
            >
              {groqBusy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Groq
            </button>
            {groqSet && (
              <button
                onClick={() => saveGroq("")}
                disabled={groqBusy}
                title="Clear Groq key"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 px-3 py-2.5 text-xs font-semibold text-slate-400 hover:text-rose-300 transition shrink-0"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {groqMsg && (
            <div
              className={`text-xs font-mono px-3 py-2 rounded-lg border ${
                groqMsg.ok
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/20"
              }`}
            >
              {groqMsg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* SOCIAL MEDIA & AUTHORITY CHANNELS                                         */
/* ────────────────────────────────────────────────────────────────────────── */
const SOCIAL_CHANNELS = [
  {
    name: "Website",
    label: "www.digiformation.co.uk",
    url: "https://www.digiformation.co.uk/",
    color: "emerald",
    bgHover: "hover:border-emerald-500/40 hover:bg-emerald-500/10",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
      </svg>
    )
  },
  {
    name: "WhatsApp",
    label: "+92 316 446 7464",
    url: "https://wa.me/923164467464",
    color: "emerald",
    bgHover: "hover:border-emerald-500/40 hover:bg-emerald-500/10",
    icon: (
      <svg className="w-4 h-4 fill-[#25D366]" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    )
  },
  {
    name: "Email",
    label: "info@digiformation.co.uk",
    url: "mailto:info@digiformation.co.uk",
    color: "teal",
    bgHover: "hover:border-teal-500/40 hover:bg-teal-500/10",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
      </svg>
    )
  },
  {
    name: "Facebook",
    label: "facebook.com/digiformation",
    url: "https://www.facebook.com/share/1D676UBQw5/",
    color: "blue",
    bgHover: "hover:border-blue-500/40 hover:bg-blue-500/10",
    icon: (
      <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    )
  },
  {
    name: "Instagram",
    label: "@digiformationltd",
    url: "https://www.instagram.com/digiformationltd?igsh=ejBoMmFsOXFpMmdw",
    color: "pink",
    bgHover: "hover:border-pink-500/40 hover:bg-pink-500/10",
    icon: (
      <svg className="w-4 h-4 fill-[#E4405F]" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    )
  },
  {
    name: "YouTube",
    label: "@digiformationltd",
    url: "https://www.youtube.com/@digiformationltd?si=wy_K54l1UISmVHJI",
    color: "red",
    bgHover: "hover:border-red-500/40 hover:bg-red-500/10",
    icon: (
      <svg className="w-4 h-4 fill-[#FF0000]" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    )
  },
  {
    name: "LinkedIn",
    label: "Muhammad Haroon",
    url: "https://www.linkedin.com/in/muhammad-haroon-9a9945366?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
    color: "sky",
    bgHover: "hover:border-sky-500/40 hover:bg-sky-500/10",
    icon: (
      <svg className="w-4 h-4 fill-[#0A66C2]" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    )
  },
  {
    name: "X (Twitter)",
    label: "@Digiformation00",
    url: "https://x.com/Digiformation00",
    color: "slate",
    bgHover: "hover:border-white/40 hover:bg-white/10",
    icon: (
      <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    )
  },
  {
    name: "Threads",
    label: "@digiformationltd",
    url: "https://www.threads.com/@digiformationltd?invite=0",
    color: "slate",
    bgHover: "hover:border-white/40 hover:bg-white/10",
    icon: (
      <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
        <path d="M12.186 24C5.467 24 .017 18.571 0 11.879 0 5.174 5.467-.25 12.186-.25c6.706 0 12.173 5.424 12.173 12.129 0 6.692-5.467 12.121-12.173 12.121zm0-22.062c-5.495 0-9.967 4.453-9.967 9.941 0 5.474 4.472 9.941 9.967 9.941 5.482 0 9.954-4.467 9.954-9.941 0-5.488-4.472-9.941-9.954-9.941z"/>
      </svg>
    )
  },
  {
    name: "Pinterest",
    label: "pin.it/digiformation",
    url: "https://pin.it/27w3dT5lp",
    color: "red",
    bgHover: "hover:border-red-500/40 hover:bg-red-500/10",
    icon: (
      <svg className="w-4 h-4 fill-[#E60023]" viewBox="0 0 24 24">
        <path d="M12 0a12 12 0 0 0-4.37 23.18c-.05-.98-.1-2.49.02-3.56.11-.98.74-6.33.74-6.33s-.19-.38-.19-.94c0-.88.51-1.54 1.15-1.54.54 0 .8.41.8.89 0 .55-.35 1.37-.53 2.12-.15.64.32 1.16.95 1.16 1.14 0 2.02-1.2 2.02-2.94 0-1.54-1.1-2.61-2.69-2.61-1.83 0-2.9 1.37-2.9 2.79 0 .55.21 1.15.48 1.47.05.07.06.12.04.2-.06.25-.2.81-.23.92-.04.16-.13.2-.3.12-1.12-.52-1.82-2.15-1.82-3.46 0-2.82 2.05-5.41 5.91-5.41 3.1 0 5.51 2.21 5.51 5.17 0 3.08-1.94 5.56-4.64 5.56-.91 0-1.76-.47-2.05-1.03l-.56 2.13c-.2.78-.75 1.76-1.12 2.36A12 12 0 1 0 12 0z"/>
      </svg>
    )
  },
  {
    name: "GOV.UK Verified",
    label: "Companies House #16994903",
    url: "https://find-and-update.company-information.service.gov.uk/company/16994903",
    color: "amber",
    bgHover: "hover:border-amber-500/40 hover:bg-amber-500/10",
    icon: (
      <svg className="w-4 h-4 fill-amber-400" viewBox="0 0 24 24">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
      </svg>
    )
  },
  {
    name: "Linktree Hub",
    label: "linktr.ee/digiformationltd",
    url: "https://linktr.ee/digiformationltd",
    color: "purple",
    bgHover: "hover:border-purple-500/40 hover:bg-purple-500/10",
    icon: (
      <svg className="w-4 h-4 fill-[#43E660]" viewBox="0 0 24 24">
        <path d="M13.51 5.92l4.89-4.89 1.41 1.41-5.05 5.05h7.24v2h-7.24l5.05 5.05-1.41 1.41-4.89-4.89v8.94h-2V15.9l-4.89 4.89-1.41-1.41 5.05-5.05H2v-2h7.24L4.19 7.29l1.41-1.41 4.89 4.89V1.83h2v4.09z"/>
      </svg>
    )
  }
];

/* ────────────────────────────────────────────────────────────────────────── */
/* ABOUT & OWNER DETAILS PANEL                                               */
/* ────────────────────────────────────────────────────────────────────────── */
function AboutPanel() {
  return (
    <div className="space-y-6">
      {/* Brand Hero Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-[#00A884]/15 border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00A884]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00A884] to-emerald-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center font-black text-2xl text-slate-950">
              D
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">Digiformation Ltd</h2>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Official UK Entity
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                UK Company Formation • Corporate Compliance • AI Automation &amp; Custom Software
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-[11px] font-mono text-slate-400">Company Reg # 16994903</div>
            <div className="text-[11px] font-mono text-emerald-400">Wolverhampton, United Kingdom</div>
          </div>
        </div>

        {/* Primary Contact Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-6 pb-2">
          <a
            href="https://www.digiformation.co.uk/"
            target="_blank"
            rel="noreferrer"
            className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-white/10 hover:border-emerald-500/40 transition flex items-center justify-between group shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                <Globe size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-300">Official Website</div>
                <div className="text-[10px] text-slate-400 font-mono">www.digiformation.co.uk</div>
              </div>
            </div>
            <ExternalLink size={13} className="text-slate-500 group-hover:text-emerald-400" />
          </a>

          <a
            href="mailto:info@digiformation.co.uk"
            className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-white/10 hover:border-teal-500/40 transition flex items-center justify-between group shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition">
                <Mail size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-teal-300">Official Email</div>
                <div className="text-[10px] text-slate-400 font-mono">info@digiformation.co.uk</div>
              </div>
            </div>
            <ExternalLink size={13} className="text-slate-500 group-hover:text-teal-400" />
          </a>

          <a
            href="https://wa.me/923164467464"
            target="_blank"
            rel="noreferrer"
            className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-white/10 hover:border-emerald-500/40 transition flex items-center justify-between group shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                <Phone size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-300">WhatsApp / Call</div>
                <div className="text-[10px] text-slate-400 font-mono">+92 316 446 7464</div>
              </div>
            </div>
            <ExternalLink size={13} className="text-slate-500 group-hover:text-emerald-400" />
          </a>
        </div>
      </div>

      {/* Complete Social Media & Linktree Network */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Social Media &amp; Verified Portals</h3>
          </div>
          <a
            href="https://linktr.ee/digiformationltd"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>linktr.ee/digiformationltd</span>
            <ExternalLink size={11} />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {SOCIAL_CHANNELS.map((ch) => (
            <a
              key={ch.name}
              href={ch.url}
              target="_blank"
              rel="noreferrer"
              className={`p-3 rounded-xl bg-slate-950/70 border border-white/5 ${ch.bgHover} transition-all flex items-center justify-between group shadow-sm`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="shrink-0 p-1.5 rounded-lg bg-white/5 group-hover:scale-110 transition">
                  {ch.icon}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate">{ch.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{ch.label}</div>
                </div>
              </div>
              <ExternalLink size={12} className="text-slate-500 group-hover:text-slate-200 shrink-0 ml-1" />
            </a>
          ))}
        </div>
      </div>

      {/* Trust & Company Summary */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400" /> Corporate Headquarters &amp; Trust
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Digiformation Ltd is an official UK-registered corporate advisory and technology firm (Company # 16994903) based at Office 1006, 85 Dunstall Hill, Wolverhampton, United Kingdom. We specialize in UK company formation, US LLC structures, corporate compliance, business banking setups, and custom AI automated sales software.
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* MAIN APPLICATION LAYOUT                                                    */
/* ────────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState<"whatsapp" | "logs" | "settings" | "about">("whatsapp");

  return (
    <div className="min-h-screen bg-[#070B0E] text-slate-100 flex flex-col justify-between selection:bg-[#00A884]/30 selection:text-white">
      {/* Top Ambient Glow Gradient */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[1700px] h-64 bg-gradient-to-b from-[#00A884]/15 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Main Full-Width Container */}
      <div className="w-full max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 relative z-10 flex-1">
        {/* Full-Width Header */}
        <header className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <WhatsAppLogo s={44} />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  WhatsApp AI Sales Agent
                </h1>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/25 shadow-sm">
                  v2.0 PRO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Autonomous Conversational Sales Engine • Multi-Account Baileys QR • Multimodal Audio &amp; Markdown Knowledge
              </p>
            </div>
          </div>

          {/* Navigation Bar in Header */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/10 shadow-inner">
              <button
                onClick={() => setTab("whatsapp")}
                className={`flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all ${
                  tab === "whatsapp"
                    ? "bg-gradient-to-r from-[#00A884] to-[#128C7E] text-white shadow-lg shadow-emerald-950/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <Smartphone size={15} />
                <span>WhatsApp Numbers</span>
              </button>

              <button
                onClick={() => setTab("logs")}
                className={`flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all ${
                  tab === "logs"
                    ? "bg-gradient-to-r from-[#00A884] to-[#128C7E] text-white shadow-lg shadow-emerald-950/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <Activity size={15} />
                <span>Live Logs</span>
              </button>

              <button
                onClick={() => setTab("settings")}
                className={`flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all ${
                  tab === "settings"
                    ? "bg-gradient-to-r from-[#00A884] to-[#128C7E] text-white shadow-lg shadow-emerald-950/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <Settings2 size={15} />
                <span>AI Brain</span>
              </button>

              <button
                onClick={() => setTab("about")}
                className={`flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all ${
                  tab === "about"
                    ? "bg-gradient-to-r from-[#00A884] to-[#128C7E] text-white shadow-lg shadow-emerald-950/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <Building2 size={15} />
                <span>Owner / About</span>
              </button>
            </div>

            <div className="hidden xl:flex items-center gap-2 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-white/10 text-xs font-mono text-slate-300 shadow">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Server Port: {window.location.port || "9000"} Active</span>
            </div>
          </div>
        </header>

        {/* Full Screen Content Area */}
        <main className="transition-all duration-300 w-full">
          {tab === "whatsapp" ? (
            <WhatsAppMulti />
          ) : tab === "logs" ? (
            <LogsPanel />
          ) : tab === "settings" ? (
            <SettingsPanel />
          ) : (
            <AboutPanel />
          )}
        </main>
      </div>

      {/* Global Full-Width Digiformation Footer */}
      <footer className="w-full max-w-[1650px] mx-auto py-6 px-4 sm:px-6 lg:px-8 border-t border-white/10 space-y-4">
        {/* Footer Brand Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5 text-left w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00A884] to-emerald-400 p-0.5 flex items-center justify-center font-black text-slate-950 text-lg shadow-lg">
              D
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Digiformation Ltd</span>
                <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                  UK #16994903
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Official UK Company Formation &amp; AI Automation Agency • Wolverhampton, UK
              </div>
            </div>
          </div>

          {/* All Social & Authority Icons in Footer */}
          <div className="flex items-center gap-2 flex-wrap justify-center w-full md:w-auto">
            {SOCIAL_CHANNELS.map((ch) => (
              <a
                key={ch.name}
                href={ch.url}
                target="_blank"
                rel="noreferrer"
                title={ch.name + ": " + ch.label}
                className="h-9 px-3 rounded-xl bg-slate-950/70 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/5 hover:border-emerald-500/30 transition flex items-center gap-2 text-xs font-medium shadow"
              >
                {ch.icon}
                <span className="hidden sm:inline">{ch.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Digiformation Universal WhatsApp Sales Agent Engine</span>
          </div>
          <div>© {new Date().getFullYear()} Digiformation Ltd. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}