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
  Cpu,
  Cloud,
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
  Info,
  Users,
  DollarSign,
  Flame,
  ArrowUpRight,
  Ban,
  TrendingUp,
  Clock,
  Target,
  Send,
  MessageSquare,
  User
} from "lucide-react";
import type { LiveEvent } from "../shared/types";
import digiformationLogo from "./assets/digiformation_logo.png";

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
    <div className="glass-card rounded-2xl p-3 border border-emerald-500/20 flex flex-col h-full min-h-0 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <BookOpen size={14} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Knowledge Base Studio
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                FACTS ONLY
              </span>
            </div>
          </div>
        </div>

        {/* View Toggle & Counters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#020a05] p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setActiveTab("edit")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                activeTab === "edit"
                  ? "bg-emerald-950/90 text-emerald-300 shadow border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Edit3 size={11} /> Edit
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                activeTab === "preview"
                  ? "bg-emerald-950/90 text-emerald-300 shadow border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Eye size={11} /> Preview
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-lg border border-white/5">
            <span>{lineCount} lines</span>
            <span>•</span>
            <span>{wordCount} words</span>
          </div>
        </div>
      </div>

      {/* Template Chips */}
      <div className="py-1 flex items-center gap-1.5 flex-wrap text-[10px]">
        <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
          <Sparkles size={10} className="text-emerald-400" /> Presets:
        </span>
        {KB_TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon;
          return (
            <button
              key={tmpl.name}
              onClick={() => applyTemplate(tmpl.template)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/90 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-300 text-[10px] font-medium transition"
            >
              <Icon size={10} />
              {tmpl.name}
            </button>
          );
        })}
      </div>

      {parseNotice && (
        <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono flex items-center gap-1.5">
          <Check size={12} className="text-emerald-400 shrink-0" />
          <span>{parseNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-mono flex items-center gap-1.5">
          <XCircle size={12} className="text-rose-400 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Editor / Preview Area — Dynamically Fills Height */}
      <div className="flex-1 min-h-0 relative my-1">
        {activeTab === "edit" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              loaded
                ? "# Company Name & Services\n- Product A: $99 (In Stock)\n- Product B: $149\n\n## Return Policy\n7-day money-back guarantee.\n\n## FAQs\n- Where is my order? Ask customer for Order ID."
                : "Loading business knowledge base..."
            }
            className="w-full h-full bg-[#020a06] border border-white/10 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed resize-none focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 placeholder-slate-600 transition"
          />
        ) : (
          <div className="w-full h-full bg-[#020a06] border border-white/10 rounded-xl p-3 text-xs text-slate-300 font-sans leading-relaxed overflow-y-auto whitespace-pre-wrap">
            {text.trim() ? (
              text
            ) : (
              <span className="text-slate-600 italic">Business Knowledge Base is currently empty.</span>
            )}
          </div>
        )}
      </div>

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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition disabled:opacity-50"
          >
            {parsing ? <Loader2 size={12} className="animate-spin text-emerald-400" /> : <Upload size={12} className="text-emerald-400" />}
            Upload Document (MD, TXT, JSON, CSV)
          </button>
        </div>

        <button
          onClick={save}
          disabled={saving || parsing}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition shadow-lg ${
            saved
              ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 shadow-emerald-950/40"
          } disabled:opacity-50`}
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : saved ? (
            <Check size={13} className="text-white" />
          ) : (
            <Save size={13} />
          )}
          {saved ? "Saved to Memory ✓" : "Save Knowledge"}
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* BLOCKLIST (IGNORE LIST) COMPONENT                                          */
/* ────────────────────────────────────────────────────────────────────────── */
function BlocklistCard({ accountId = "0" }: { accountId?: string }) {
  const [numbers, setNumbers] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    fetch(`/api/whatsapp/blocklist?id=${accountId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Array.isArray(d.blocklist)) setNumbers(d.blocklist);
      })
      .catch(() => {});
  }, [accountId]);

  const saveBlocklist = async (list: string[]) => {
    setSaving(true);
    try {
      await fetch("/api/whatsapp/blocklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: accountId, numbers: list }),
      });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const addNumber = () => {
    const clean = inputVal.replace(/\D/g, "");
    if (!clean || numbers.includes(clean)) return;
    const next = [...numbers, clean];
    setNumbers(next);
    setInputVal("");
    saveBlocklist(next);
  };

  const removeNumber = (num: string) => {
    const next = numbers.filter((n) => n !== num);
    setNumbers(next);
    saveBlocklist(next);
  };

  return (
    <div className="glass-card rounded-2xl p-3 border border-white/10 space-y-2 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Ban size={13} className="text-rose-400" />
          <span>Excluded Numbers (No Auto-Reply)</span>
        </div>
        {savedMsg && <span className="text-[10px] text-emerald-400 font-mono">Saved ✓</span>}
      </div>

      <div className="flex gap-1.5">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNumber()}
          placeholder="e.g. 447123456789 or 03001234567"
          className="flex-1 bg-[#020a06] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500"
        />
        <button
          onClick={addNumber}
          disabled={saving || !inputVal.trim()}
          className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold disabled:opacity-40 transition"
        >
          Add
        </button>
      </div>

      {numbers.length > 0 ? (
        <div className="flex flex-wrap gap-1 pt-0.5 max-h-16 overflow-y-auto">
          {numbers.map((num) => (
            <span
              key={num}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-white/5 text-[10px] font-mono text-slate-300"
            >
              +{num}
              <button
                onClick={() => removeNumber(num)}
                className="text-slate-500 hover:text-rose-400 transition"
                title="Remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-slate-500 italic">No numbers excluded (bot will reply to all inbound).</div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* SINGLE WHATSAPP CHANNEL                                                    */
/* ────────────────────────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────────────── */
/* LIVE WHATSAPP CHAT & TRACKING STUDIO                                       */
/* ────────────────────────────────────────────────────────────────────────── */
function LiveChatTracking({ accountId = "0" }: { accountId?: string }) {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [contactsMap, setContactsMap] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load chats & CRM contacts periodically
  const loadChats = useCallback(() => {
    fetch("/api/whatsapp/chats?limit=60")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Array.isArray(d.chats)) {
          setChats(d.chats);
          setSelectedJid((prev) => {
            if (prev && d.chats.some((c: any) => c.chat_jid === prev)) return prev;
            return d.chats.length > 0 ? d.chats[0].chat_jid : null;
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingChats(false));

    fetch("/api/whatsapp/crm")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Array.isArray(d.contacts)) {
          const map: Record<string, any> = {};
          for (const c of d.contacts) {
            map[c.number] = c;
          }
          setContactsMap(map);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 2500);
    return () => clearInterval(interval);
  }, [loadChats]);

  // Load messages for selected chat
  const loadMessages = useCallback((jid: string, spin = false) => {
    if (!jid) return;
    if (spin) setLoadingMessages(true);
    fetch(`/api/whatsapp/chat/messages?jid=${encodeURIComponent(jid)}&limit=100`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Array.isArray(d.messages)) {
          setMessages(d.messages);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, []);

  useEffect(() => {
    if (selectedJid) {
      loadMessages(selectedJid, true);
      const interval = setInterval(() => loadMessages(selectedJid, false), 2000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [selectedJid, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send manual reply
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = replyText.trim();
    if (!text || !selectedJid || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: selectedJid, text, id: accountId }),
      });
      const data = await res.json();
      if (data?.ok) {
        setReplyText("");
        setMessages((prev) => [
          ...prev,
          { from_me: 1, text, ts: Date.now(), sender: "You" }
        ]);
        setTimeout(() => loadMessages(selectedJid, false), 400);
      }
    } catch {
    } finally {
      setSending(false);
    }
  };

  // Change lead status in CRM
  const handleStatusChange = async (number: string, newStatus: string) => {
    try {
      await fetch("/api/whatsapp/crm/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, status: newStatus }),
      });
      loadChats();
    } catch {}
  };

  // Filter conversations
  const filteredChats = chats.filter((c) => {
    const q = search.toLowerCase();
    const num = (c.chat_jid || "").replace(/\D/g, "");
    const name = (c.name || "").toLowerCase();
    const text = (c.last_text || "").toLowerCase();
    return num.includes(q) || name.includes(q) || text.includes(q);
  });

  const activeChat = chats.find((c) => c.chat_jid === selectedJid);
  const cleanPhone = (selectedJid || "").replace(/@.*$/, "").replace(/\D/g, "");
  const activeCrm = contactsMap[cleanPhone];
  const dealStatus = activeCrm?.dealStatus || "engaged";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0 overflow-hidden">
      {/* ── LEFT PANE: Conversation & Client List (35%) ── */}
      <div className="lg:col-span-4 glass-card rounded-2xl p-3 border border-white/10 flex flex-col h-full min-h-0 shadow-xl overflow-hidden">
        {/* Search & Header */}
        <div className="space-y-2 pb-2.5 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
              <MessageSquare size={13} className="text-emerald-400" />
              <span>Client Conversations</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              {chats.length} active
            </span>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by phone or name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pt-2 pr-0.5 min-h-0">
          {loadingChats && chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-2">
              <Loader2 size={18} className="animate-spin text-emerald-400" />
              <div className="text-xs">Loading conversations...</div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-10 px-3 text-slate-500 space-y-2">
              <Smartphone size={24} className="mx-auto text-slate-600" />
              <div className="text-xs font-semibold text-slate-400">No conversations found</div>
              <div className="text-[11px] text-slate-500">
                When a customer messages this number on WhatsApp, their chat will automatically appear here.
              </div>
            </div>
          ) : (
            filteredChats.map((c) => {
              const isSelected = c.chat_jid === selectedJid;
              const phoneDigits = (c.chat_jid || "").replace(/@.*$/, "").replace(/\D/g, "");
              const crm = contactsMap[phoneDigits];
              const stage = crm?.dealStatus || "engaged";
              const lastTime = c.last_ts ? new Date(c.last_ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

              return (
                <div
                  key={c.chat_jid}
                  onClick={() => setSelectedJid(c.chat_jid)}
                  className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_15px_-3px_rgba(37,211,102,0.25)]"
                      : "bg-slate-900/50 hover:bg-slate-800/60 border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {c.name ? c.name.charAt(0).toUpperCase() : <User size={11} />}
                      </div>
                      <span className="text-xs font-bold text-white truncate">
                        {c.name || `+${phoneDigits}`}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{lastTime}</span>
                  </div>

                  <div className="text-[11px] text-slate-400 truncate mb-1.5">
                    {c.last_from_me === 1 && <span className="text-emerald-400 font-semibold mr-1">You:</span>}
                    {c.last_text || "Started conversation"}
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-500">+{phoneDigits}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-semibold capitalize ${
                        stage === "won"
                          ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                          : stage === "lost"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : stage === "new"
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {stage}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANE: Live Conversation Stream & Manual Reply (65%) ── */}
      <div className="lg:col-span-8 glass-card rounded-2xl p-3 border border-white/10 flex flex-col h-full min-h-0 shadow-xl overflow-hidden">
        {selectedJid ? (
          <>
            {/* Active Chat Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {activeChat?.name ? activeChat.name.charAt(0).toUpperCase() : <User size={14} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {activeChat?.name || `Customer (+${cleanPhone})`}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      +{cleanPhone}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>LangGraph Autonomous Agent Active</span>
                  </div>
                </div>
              </div>

              {/* Deal Status Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">Deal Stage:</span>
                <select
                  value={dealStatus}
                  onChange={(e) => handleStatusChange(cleanPhone, e.target.value)}
                  className="bg-slate-900/90 text-xs rounded-xl px-2.5 py-1 border border-white/10 text-white font-semibold focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="new">New Lead</option>
                  <option value="engaged">Engaged / In Discussion</option>
                  <option value="won">Won Deal (Closed)</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            </div>

            {/* Messages Thread Feed */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 min-h-0">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                  <Loader2 size={18} className="animate-spin text-emerald-400 mr-2" />
                  <span className="text-xs">Loading message history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  No messages recorded in this chat yet.
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMe = Boolean(m.from_me);
                  const time = m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-2.5 px-3.5 text-xs shadow-md ${
                          isMe
                            ? "bg-gradient-to-r from-emerald-600/30 to-teal-700/30 border border-emerald-500/35 text-white rounded-tr-sm"
                            : "bg-slate-800/80 border border-white/10 text-slate-100 rounded-tl-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-75">
                          <span className="font-bold">
                            {isMe ? "Digi AI Agent" : activeChat?.name || `+${cleanPhone}`}
                          </span>
                          <span className="font-mono text-[9px]">{time}</span>
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed select-text font-sans">
                          {m.text}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Reply Form */}
            <form onSubmit={handleSend} className="pt-2 border-t border-white/10 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Type a manual reply to +${cleanPhone}...`}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                type="submit"
                disabled={sending || !replyText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold shadow-md transition shrink-0"
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
            <MessageSquare size={32} className="text-slate-600" />
            <div className="text-sm font-semibold text-slate-300">Select a conversation</div>
            <div className="text-xs text-slate-500 max-w-sm text-center">
              Choose a customer conversation from the list to view live message history and send manual replies.
            </div>
          </div>
        )}
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
  const [view, setView] = useState<"chat" | "kb" | "engine">("chat");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback((spin = true) => {
    if (spin) setLoading(true);
    fetch(`/api/whatsapp/status?id=${accountId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() =>
        setStatus({ connected: false, state: "error", status: "error", message: "Failed to reach server" })
      )
      .finally(() => setLoading(false));
  }, [accountId]);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(() => fetchStatus(false), 2500);
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

  const state = status?.state || status?.status || "disconnected";
  const connected = Boolean(status?.connected || state === "connected" || (status?.phone && state !== "disconnected"));
  const connecting = state === "connecting";
  const qr = (!connected && (status?.qr || null)) || null;

  // ── Render When NOT Connected: QR Pairing View ──
  if (!connected) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0 overflow-hidden">
        {/* Left Column: QR Pairing Card */}
        <div className="lg:col-span-5 flex flex-col gap-3 h-full min-h-0 overflow-y-auto pr-0.5">
          <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-3.5 shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <QrCode size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">WhatsApp Mobile Pairing</h3>
                <p className="text-[11px] text-slate-400">Scan QR code from your phone's WhatsApp</p>
              </div>
            </div>

            {/* QR box */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
              {qr ? (
                <div className="p-2 bg-white rounded-xl shadow-2xl border-2 border-emerald-500/40">
                  <img src={qr} alt="WhatsApp QR Code" className="w-44 h-44 rounded" />
                </div>
              ) : (
                <div className="py-7 flex flex-col items-center text-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Smartphone size={24} />
                  </div>
                  <div className="text-xs font-bold text-slate-200">Ready to Pair Device</div>
                  <div className="text-[11px] text-slate-500 max-w-xs">
                    Click the button below to generate a pairing QR code for your WhatsApp number.
                  </div>
                </div>
              )}

              <button
                onClick={connect}
                disabled={busy || connecting || state === "qr_ready"}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition"
              >
                {busy || connecting ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                {qr ? "Regenerate QR Code" : "Start & Connect WhatsApp"}
              </button>
            </div>

            {/* Instructions */}
            <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-1.5 text-xs text-slate-400">
              <div className="font-bold text-slate-200">How to link your WhatsApp:</div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                <li>Open WhatsApp on your mobile phone</li>
                <li>Tap <strong className="text-slate-300">Settings</strong> (or 3 dots) → <strong className="text-slate-300">Linked Devices</strong></li>
                <li>Tap <strong className="text-emerald-400">Link a Device</strong> and point your camera here</li>
              </ol>
            </div>
          </div>

          {/* Try DIGI BIZ OS Flagship Promo Card */}
          <a
            href="https://www.digibizos.co.uk/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/30 hover:border-emerald-400/60 shadow-lg transition-all group no-underline"
            title="Try DIGI BIZ OS - Claim 3-Day Free Trial"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚡ Flagship Platform</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[8px] border border-emerald-500/30">3-Day Free Trial</span>
                </div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition">Try DIGI BIZ OS</div>
                <div className="text-[10px] text-slate-400">All-in-One Business Suite &bull; Local CRM &bull; Offline Tools</div>
              </div>
              <span className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 group-hover:bg-emerald-500/30 group-hover:scale-105 transition shrink-0 flex items-center gap-1">
                <span>Explore</span>
                <ExternalLink size={10} />
              </span>
            </div>
          </a>

          {/* Engine Highlights */}
          <div className="glass-card rounded-2xl p-3 border border-white/10 space-y-2 shadow-xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
              <Zap size={13} className="text-emerald-400" />
              <span>Universal Sales Engine</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5 space-y-0.5">
                <div className="text-slate-400 text-[10px]">Zero-AI Fallback</div>
                <div className="text-emerald-400 font-bold font-mono text-[11px]">0ms Active</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5 space-y-0.5">
                <div className="text-slate-400 text-[10px]">Language Mode</div>
                <div className="text-teal-300 font-bold font-mono text-[11px]">Roman Urdu / EN</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Knowledge Base Studio */}
        <div className="lg:col-span-7 h-full min-h-0 flex flex-col">
          <KnowledgeBase accountId={accountId} />
        </div>
      </div>
    );
  }

  // ── Render When CONNECTED: Dedicated Live Chat & Tracking Feed, No QR Code, No Connect Buttons ──
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      {/* ── Top Status Bar (Only Connected Status, Number, Mode Selector, Auto-reply, Unlink) ── */}
      <div className="glass-card rounded-2xl p-2.5 px-4 border border-white/10 flex items-center justify-between gap-4 shadow-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 glow-green">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold tracking-tight text-emerald-400">
                Connected &amp; Online
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {status?.phone && (
                <span className="font-mono text-emerald-300 text-xs font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                  +{status.phone}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400">
              LangGraph Autonomous Sales Agent actively handling client inquiries
            </div>
          </div>
        </div>

        {/* Sub-tabs: Live Chat & Tracking / Knowledge Base / Engine */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setView("chat")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              view === "chat"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare size={13} />
            <span>Live Chat &amp; Tracking</span>
          </button>
          <button
            onClick={() => setView("kb")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              view === "kb"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen size={13} />
            <span>Knowledge Base</span>
          </button>
          <button
            onClick={() => setView("engine")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              view === "engine"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Settings2 size={13} />
            <span>Engine &amp; Blocklist</span>
          </button>
        </div>

        {/* AI Auto-Reply Switch & Unlink */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/60 border border-white/5">
            <Bot size={14} className={agentActive ? "text-[#25D366]" : "text-slate-500"} />
            <span className="text-xs font-semibold text-slate-300">Auto-Reply</span>
            <button
              onClick={toggleAgent}
              disabled={togglingAgent}
              aria-pressed={agentActive}
              className={`relative shrink-0 h-5 w-9 rounded-full transition-colors ${
                agentActive ? "bg-[#25D366]" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                  agentActive ? "left-[18px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <button
            onClick={() => fetchStatus()}
            title="Refresh status"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/5 transition"
          >
            <RefreshCw size={12} />
          </button>

          <button
            onClick={disconnect}
            disabled={busy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition disabled:opacity-50"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Link2Off size={11} />}
            Unlink
          </button>
        </div>
      </div>

      {/* ── Main Connected Workspace ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === "chat" ? (
          <LiveChatTracking accountId={accountId} />
        ) : view === "kb" ? (
          <KnowledgeBase accountId={accountId} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full min-h-0 overflow-y-auto">
            <BlocklistCard accountId={accountId} />
            <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Zap size={14} className="text-emerald-400" />
                <span>LangGraph Sales Engine Architecture</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Autonomous 8-stage state graph operating on client interactions: Discovery → Clarification → Pitching → Objection Handling → Closing.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="text-slate-400 text-[10px]">Fallback Protocol</div>
                  <div className="text-emerald-400 font-bold font-mono">0ms Zero-AI Hardcoded</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="text-slate-400 text-[10px]">Memory Engine</div>
                  <div className="text-purple-300 font-bold font-mono">SQLite Local DB</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="text-slate-400 text-[10px]">Language Mode</div>
                  <div className="text-teal-300 font-bold font-mono">Roman Urdu + English</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="text-slate-400 text-[10px]">Group Protection</div>
                  <div className="text-rose-300 font-bold font-mono">Groups Blocked 100%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* SINGLE ACCOUNT CONTAINER (Simple 1 WhatsApp Slot)                         */
/* ────────────────────────────────────────────────────────────────────────── */
function WhatsAppMulti() {
  return <WhatsAppChannel accountId="0" />;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* CRM & WEBSITE LEADS PANEL                                                  */
/* ────────────────────────────────────────────────────────────────────────── */
function CrmLeadsPanel() {
  const [subTab, setSubTab] = useState<"contacts" | "website" | "followups">("contacts");
  const [crmData, setCrmData] = useState<{ summary: any; contacts: any[] }>({
    summary: { totalCustomers: 0, engaged: 0, won: 0, lost: 0, revenue: 0, currency: "GBP" },
    contacts: [],
  });
  const [webLeads, setWebLeads] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingNum, setUpdatingNum] = useState<string | null>(null);

  const loadData = useCallback(() => {
    Promise.all([
      fetch("/api/whatsapp/crm").then((r) => r.json()).catch(() => ({})),
      fetch("/api/crm/web_whatsapp").then((r) => r.json()).catch(() => ({})),
      fetch("/api/whatsapp/followups").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([crmRes, webRes, folRes]) => {
        if (crmRes?.ok) {
          setCrmData({
            summary: crmRes.summary || {},
            contacts: crmRes.contacts || [],
          });
        }
        if (webRes?.ok && Array.isArray(webRes.leads)) {
          setWebLeads(webRes.leads);
        }
        if (folRes?.ok && Array.isArray(folRes.followups)) {
          setFollowups(folRes.followups);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 5000);
    return () => clearInterval(t);
  }, [loadData]);

  const updateDeal = async (number: string, status: string, saleAmount?: number) => {
    setUpdatingNum(number);
    try {
      await fetch("/api/whatsapp/crm/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, status, saleAmount }),
      });
      loadData();
    } catch {
    } finally {
      setUpdatingNum(null);
    }
  };

  const sum = crmData.summary || {};

  return (
    <div className="space-y-6">
      {/* ── Top KPI Banner (4 Stat Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contacts */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Total Pipeline Leads</span>
            <Users size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{sum.totalCustomers ?? 0}</div>
          <div className="text-[11px] text-slate-500">Live contacts recorded by agent</div>
        </div>

        {/* Engaged Leads */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Engaged Prospects</span>
            <Flame size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono">{sum.engaged ?? 0}</div>
          <div className="text-[11px] text-slate-500">Active multi-turn discussions</div>
        </div>

        {/* Won Deals */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Won Deals</span>
            <CheckCircle2 size={16} className="text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-teal-300 font-mono">{sum.won ?? 0}</div>
          <div className="text-[11px] text-slate-500">Completed client conversions</div>
        </div>

        {/* Sales Revenue */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Verified Revenue</span>
            <DollarSign size={16} className="text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-300 font-mono">
            {sum.currency || "£"} {Number(sum.revenue || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Recorded deal sales value</div>
        </div>
      </div>

      {/* ── Sub-navigation Tabs ── */}
      <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-white/10 w-fit">
        <button
          onClick={() => setSubTab("contacts")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            subTab === "contacts"
              ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Customer Book ({crmData.contacts.length})
        </button>
        <button
          onClick={() => setSubTab("website")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            subTab === "website"
              ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          From Website Leads ({webLeads.length})
        </button>
        <button
          onClick={() => setSubTab("followups")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            subTab === "followups"
              ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Follow-up Intelligence ({followups.length})
        </button>
      </div>

      {/* ── SUB-TAB 1: Contacts & Deal Book ── */}
      {subTab === "contacts" && (
        <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">WhatsApp Sales Pipeline Book</h3>
              <p className="text-xs text-slate-400">All customer conversations tracked with automatic deal stage updates.</p>
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {crmData.contacts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic">
              No contacts recorded yet. When customers message your WhatsApp agent, they will automatically appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-[11px] font-semibold uppercase">
                    <th className="pb-3 px-3">Contact</th>
                    <th className="pb-3 px-3">Phone</th>
                    <th className="pb-3 px-3">Messages</th>
                    <th className="pb-3 px-3">Deal Status</th>
                    <th className="pb-3 px-3">Deal Value</th>
                    <th className="pb-3 px-3">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {crmData.contacts.map((c) => (
                    <tr key={c.number} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-semibold text-white">{c.name || "Customer"}</td>
                      <td className="py-3 px-3 font-mono text-emerald-400">+{c.number}</td>
                      <td className="py-3 px-3 font-mono text-slate-300">{c.messages} msgs</td>
                      <td className="py-3 px-3">
                        <select
                          value={c.dealStatus || c.deal_status || "new"}
                          disabled={updatingNum === c.number}
                          onChange={(e) => updateDeal(c.number, e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:border-sky-500"
                        >
                          <option value="new">New Lead</option>
                          <option value="engaged">Engaged</option>
                          <option value="won">Won Deal</option>
                          <option value="lost">Lost</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-200">
                        {c.currency || "£"} {c.saleAmount || c.deal_value || 0}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {new Date(c.lastContact || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SUB-TAB 2: From Website Leads ── */}
      {subTab === "website" && (
        <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Website WhatsApp Widget Leads</h3>
            <p className="text-xs text-slate-400">Visitors who clicked or initiated chats from your website widget.</p>
          </div>

          {webLeads.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic">
              No website leads recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {webLeads.map((w) => (
                <div key={w.id} className="p-4 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Globe size={13} className="text-sky-400" />
                      <span>{w.customer}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">{w.source}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 font-mono">
                      {w.status?.toUpperCase() || "ACTIVE"}
                    </span>
                    <div className="text-[10px] text-slate-500">
                      {new Date(w.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SUB-TAB 3: Follow-up Intelligence ── */}
      {subTab === "followups" && (
        <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Deterministic Follow-up Intelligence</h3>
            <p className="text-xs text-slate-400">Commercial opportunities identified by intent rules with evidence trails.</p>
          </div>

          {followups.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic">
              No pending follow-ups. All customer chats are either resolved or have no outstanding asks.
            </div>
          ) : (
            <div className="space-y-3">
              {followups.map((f, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-950/70 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{f.name}</span>
                      {f.service && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
                          {f.service}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase font-mono ${
                          f.priority === "HIGH"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : f.priority === "MEDIUM"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {f.priority} Priority
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{f.when}</span>
                  </div>

                  <p className="text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                    {f.owner_question}
                  </p>

                  {f.evidence && f.evidence.length > 0 && (
                    <div className="space-y-1 text-[11px]">
                      {f.evidence.map((ev: any, j: number) => (
                        <div key={j} className="flex items-start gap-1.5 text-slate-400">
                          <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                            {ev.kind}
                          </span>
                          <span>{ev.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
  // Google Gemini AI Key
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiHint, setGeminiHint] = useState("");
  const [geminiSet, setGeminiSet] = useState(false);
  const [geminiBusy, setGeminiBusy] = useState(false);
  const [geminiMsg, setGeminiMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Groq Cloud High-Speed LPU & Whisper STT Key
  const [groqKey, setGroqKey] = useState("");
  const [groqHint, setGroqHint] = useState("");
  const [groqSet, setGroqSet] = useState(false);
  const [groqBusy, setGroqBusy] = useState(false);
  const [groqMsg, setGroqMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Model selectors state
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [groqModel, setGroqModel] = useState("qwen/qwen3.8-27b");

  // GitHub Models Key (100% Free via GitHub Personal Access Token)
  const [ghToken, setGhToken] = useState("");
  const [ghModel, setGhModel] = useState("gpt-4o-mini");
  const [ghHint, setGhHint] = useState("");
  const [ghSet, setGhSet] = useState(false);
  const [ghBusy, setGhBusy] = useState(false);
  const [ghMsg, setGhMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Cloudflare Workers AI
  const [cfAccountId, setCfAccountId] = useState("");
  const [cfToken, setCfToken] = useState("");
  const [cfModel, setCfModel] = useState("@cf/meta/llama-3.3-70b-instruct");
  const [cfSet, setCfSet] = useState(false);
  const [cfAccountHint, setCfAccountHint] = useState("");
  const [cfBusy, setCfBusy] = useState(false);
  const [cfMsg, setCfMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Mistral AI (1B tokens free tier)
  const [mistralKey, setMistralKey] = useState("");
  const [mistralHint, setMistralHint] = useState("");
  const [mistralModel, setMistralModel] = useState("mistral-small-latest");
  const [mistralSet, setMistralSet] = useState(false);
  const [mistralBusy, setMistralBusy] = useState(false);
  const [mistralMsg, setMistralMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // SambaNova Cloud (100% Free Developer Tier 400 T/s)
  const [sambaKey, setSambaKey] = useState("");
  const [sambaHint, setSambaHint] = useState("");
  const [sambaModel, setSambaModel] = useState("Meta-Llama-3.1-70B-Instruct");
  const [sambaSet, setSambaSet] = useState(false);
  const [sambaBusy, setSambaBusy] = useState(false);
  const [sambaMsg, setSambaMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Together AI (Open-Source Free Models)
  const [togetherKey, setTogetherKey] = useState("");
  const [togetherHint, setTogetherHint] = useState("");
  const [togetherModel, setTogetherModel] = useState("meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo");
  const [togetherSet, setTogetherSet] = useState(false);
  const [togetherBusy, setTogetherBusy] = useState(false);
  const [togetherMsg, setTogetherMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    fetch("/api/config/gemini-key", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setGeminiSet(Boolean(d.set));
        setGeminiHint(d.hint || "");
        if (d.model) setGeminiModel(d.model);
      })
      .catch(() => {});

    fetch("/api/config/groq-key", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setGroqSet(Boolean(d.set));
        setGroqHint(d.hint || "");
        if (d.model) setGroqModel(d.model);
      })
      .catch(() => {});

    fetch("/api/config/cloudflare-key", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setCfSet(Boolean(d.set));
        setCfAccountHint(d.accountIdHint || "");
        if (d.model) setCfModel(d.model);
      })
      .catch(() => {});

    fetch("/api/config/mistral-key", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setMistralSet(Boolean(d.set));
        setMistralHint(d.hint || "");
        if (d.model) setMistralModel(d.model);
      })
      .catch(() => {});

    fetch("/api/config/github-key", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setGhSet(Boolean(d.set));
        setGhHint(d.hint || "");
        if (d.model) setGhModel(d.model);
      })
      .catch(() => {});

    fetch("/api/config/sambanova-key", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setSambaSet(Boolean(d.set));
        setSambaHint(d.hint || "");
        if (d.model) setSambaModel(d.model);
      })
      .catch(() => {});

    fetch("/api/config/together-key", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setTogetherSet(Boolean(d.set));
        setTogetherHint(d.hint || "");
        if (d.model) setTogetherModel(d.model);
      })
      .catch(() => {});
  };

  useEffect(load, []);

  const saveGemini = async (clear?: boolean) => {
    setGeminiBusy(true);
    setGeminiMsg(null);
    try {
      const r = await fetch("/api/config/gemini-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: clear ? "" : geminiKey.trim(), model: geminiModel }),
      });
      const d = await r.json();
      setGeminiSet(Boolean(d.set));
      setGeminiMsg({
        ok: Boolean(d.ok),
        text: d.ok
          ? (clear ? "Gemini key cleared." : "Google Gemini saved successfully!")
          : d.error || "Save failed",
      });
      if (d.ok) {
        if (!clear) setGeminiKey("");
        load();
      }
    } catch {
      setGeminiMsg({ ok: false, text: "Network error saving Gemini key" });
    } finally {
      setGeminiBusy(false);
    }
  };

  const saveGroq = async (clear?: boolean) => {
    setGroqBusy(true);
    setGroqMsg(null);
    try {
      const r = await fetch("/api/config/groq-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: clear ? "" : groqKey.trim(), model: groqModel }),
      });
      const d = await r.json();
      setGroqSet(Boolean(d.set));
      setGroqMsg({
        ok: Boolean(d.ok),
        text: d.ok
          ? (clear ? "Groq key cleared." : "Groq LPU saved successfully!")
          : d.error || "Save failed",
      });
      if (d.ok) {
        if (!clear) setGroqKey("");
        load();
      }
    } catch {
      setGroqMsg({ ok: false, text: "Network error saving Groq key" });
    } finally {
      setGroqBusy(false);
    }
  };

  const saveCloudflare = async (clear?: boolean) => {
    setCfBusy(true);
    setCfMsg(null);
    try {
      const r = await fetch("/api/config/cloudflare-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: clear ? "" : cfAccountId.trim(),
          token: clear ? "" : cfToken.trim(),
          model: cfModel.trim(),
        }),
      });
      const d = await r.json();
      setCfSet(Boolean(d.set));
      setCfMsg({
        ok: Boolean(d.ok),
        text: d.ok
          ? (!clear && cfAccountId && cfToken)
            ? "Cloudflare Workers AI saved!"
            : "Cloudflare credentials cleared."
          : d.error || "Save failed",
      });
      if (d.ok) {
        if (!clear) {
          setCfAccountId("");
          setCfToken("");
        }
        load();
      }
    } catch {
      setCfMsg({ ok: false, text: "Network error saving Cloudflare credentials" });
    } finally {
      setCfBusy(false);
    }
  };

  const saveMistral = async (clear?: boolean) => {
    setMistralBusy(true);
    setMistralMsg(null);
    try {
      const r = await fetch("/api/config/mistral-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: clear ? "" : mistralKey.trim(), model: mistralModel }),
      });
      const d = await r.json();
      setMistralSet(Boolean(d.set));
      setMistralMsg({
        ok: Boolean(d.ok),
        text: d.ok
          ? (clear ? "Mistral key cleared." : "Mistral AI saved! 1B tokens free tier active.")
          : d.error || "Save failed",
      });
      if (d.ok) {
        if (!clear) setMistralKey("");
        load();
      }
    } catch {
      setMistralMsg({ ok: false, text: "Network error saving Mistral key" });
    } finally {
      setMistralBusy(false);
    }
  };

  const saveGitHub = async (clear?: boolean) => {
    setGhBusy(true);
    setGhMsg(null);
    try {
      const r = await fetch("/api/config/github-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: clear ? "" : ghToken.trim(),
          model: ghModel.trim(),
        }),
      });
      const d = await r.json();
      setGhSet(Boolean(d.set));
      setGhMsg({
        ok: Boolean(d.ok),
        text: d.ok
          ? (!clear && ghToken.trim())
            ? "GitHub Models token saved! 100% Free GPT-4o-mini active."
            : "GitHub token cleared."
          : d.error || "Save failed",
      });
      if (d.ok) {
        if (!clear) setGhToken("");
        load();
      }
    } catch {
      setGhMsg({ ok: false, text: "Network error saving GitHub token" });
    } finally {
      setGhBusy(false);
    }
  };

  const saveSambaNova = async (clear?: boolean) => {
    setSambaBusy(true);
    setSambaMsg(null);
    try {
      const r = await fetch("/api/config/sambanova-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: clear ? "" : sambaKey.trim(),
          model: sambaModel.trim(),
        }),
      });
      const d = await r.json();
      setSambaSet(Boolean(d.set));
      setSambaMsg({
        ok: Boolean(d.ok),
        text: d.ok
          ? (clear ? "SambaNova key cleared." : "SambaNova saved! 400 T/s free inference active.")
          : d.error || "Save failed",
      });
      if (d.ok) {
        if (!clear) setSambaKey("");
        load();
      }
    } catch {
      setSambaMsg({ ok: false, text: "Network error saving SambaNova key" });
    } finally {
      setSambaBusy(false);
    }
  };

  const saveTogether = async (clear?: boolean) => {
    setTogetherBusy(true);
    setTogetherMsg(null);
    try {
      const r = await fetch("/api/config/together-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: clear ? "" : togetherKey.trim(),
          model: togetherModel.trim(),
        }),
      });
      const d = await r.json();
      setTogetherSet(Boolean(d.set));
      setTogetherMsg({
        ok: Boolean(d.ok),
        text: d.ok
          ? (clear ? "Together AI key cleared." : "Together AI saved successfully!")
          : d.error || "Save failed",
      });
      if (d.ok) {
        if (!clear) setTogetherKey("");
        load();
      }
    } catch {
      setTogetherMsg({ ok: false, text: "Network error saving Together key" });
    } finally {
      setTogetherBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Cascade Overview Banner */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-emerald-950/30 border border-blue-500/20 shadow-lg flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
              7-Tier Resilient Free AI Reasoning Cascade (100% Free Quotas)
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              <span className="text-blue-400 font-semibold">Gemini Flash (#1)</span> &rarr; <span className="text-amber-400 font-semibold">Groq (12ms)</span> &rarr; <span className="text-cyan-400 font-semibold">Cloudflare</span> &rarr; <span className="text-orange-400 font-semibold">Mistral</span> &rarr; <span className="text-purple-400 font-semibold">GitHub Models</span> &rarr; <span className="text-emerald-400 font-semibold">SambaNova</span> &rarr; <span className="text-pink-400 font-semibold">Together AI</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          <CheckCircle2 size={13} />
          Zero-Cost Cascade Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
        {/* 1. Google Gemini AI Engine (#1 Recommended) */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between shadow-xl space-y-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    Google Gemini
                    <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">#1 Free</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">15 RPM &bull; Multilingual Roman Urdu/Urdu</p>
                </div>
              </div>

              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-[10px] font-bold shadow-md transition shrink-0"
              >
                <ExternalLink size={11} />
                GET KEY
              </a>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono pt-1">
              <span className="text-slate-400">Status:</span>
              <span className={`px-2 py-0.5 rounded-full border ${geminiSet ? "bg-blue-500/10 text-blue-400 border-blue-500/25" : "bg-slate-800 text-slate-400 border-white/5"}`}>
                {geminiSet ? `Active (${geminiHint})` : "Not Configured"}
              </span>
            </div>

            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              className="w-full rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-blue-400 font-mono transition"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Smart &amp; Fast - Recommended)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash (Ultra-Fast 2.0)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash (1M High Context)</option>
            </select>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <div className="flex gap-1.5">
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy... Paste Gemini Key"
                className="flex-1 min-w-0 rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-400 font-mono placeholder-slate-600 transition"
              />
              <button
                onClick={() => saveGemini()}
                disabled={geminiBusy || !geminiKey.trim()}
                className="flex items-center justify-center gap-1 rounded-lg bg-blue-600 hover:brightness-110 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white shadow transition shrink-0"
              >
                {geminiBusy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </button>
              {geminiSet && (
                <button
                  onClick={() => saveGemini("")}
                  disabled={geminiBusy}
                  title="Clear Gemini key"
                  className="flex items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 px-2 py-1.5 text-xs text-slate-400 hover:text-rose-300 transition shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {geminiMsg && (
              <div className={`text-[10px] font-mono px-2 py-1 rounded border ${geminiMsg.ok ? "bg-blue-500/10 text-blue-300 border-blue-500/20" : "bg-rose-500/10 text-rose-300 border-rose-500/20"}`}>
                {geminiMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* 2. Groq LPU High-Speed Cloud */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between shadow-xl space-y-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Zap size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    Groq Cloud LPU
                    <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">12ms Speed</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Sub-second inference &amp; Whisper STT</p>
                </div>
              </div>

              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 text-[10px] font-bold shadow-md transition shrink-0"
              >
                <ExternalLink size={11} />
                GET KEY
              </a>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono pt-1">
              <span className="text-slate-400">Status:</span>
              <span className={`px-2 py-0.5 rounded-full border ${groqSet ? "bg-amber-500/10 text-amber-400 border-amber-500/25" : "bg-slate-800 text-slate-400 border-white/5"}`}>
                {groqSet ? `Active (${groqHint})` : "Whisper Fallback"}
              </span>
            </div>

            <select
              value={groqModel}
              onChange={(e) => setGroqModel(e.target.value)}
              className="w-full rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-amber-400 font-mono transition"
            >
              <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b (12ms Ultra-Fast - Recommended)</option>
              <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Deep Reasoning 120B)</option>
              <option value="openai/gpt-oss-20b">openai/gpt-oss-20b (Lightweight Fast)</option>
              <option value="allam-2-7b">allam-2-7b (Urdu/Arabic Multilingual)</option>
            </select>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <div className="flex gap-1.5">
              <input
                type="password"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_... Paste Groq API Key"
                className="flex-1 min-w-0 rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400 font-mono placeholder-slate-600 transition"
              />
              <button
                onClick={() => saveGroq()}
                disabled={groqBusy || !groqKey.trim()}
                className="flex items-center justify-center gap-1 rounded-lg bg-amber-500 hover:brightness-110 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-slate-950 shadow transition shrink-0"
              >
                {groqBusy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </button>
              {groqSet && (
                <button
                  onClick={() => saveGroq("")}
                  disabled={groqBusy}
                  title="Clear Groq key"
                  className="flex items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 px-2 py-1.5 text-xs text-slate-400 hover:text-rose-300 transition shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {groqMsg && (
              <div className={`text-[10px] font-mono px-2 py-1 rounded border ${groqMsg.ok ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-rose-500/10 text-rose-300 border-rose-500/20"}`}>
                {groqMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* 3. Cloudflare Workers AI */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between shadow-xl space-y-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Globe size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    Cloudflare AI
                    <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">10k Neurons</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">10,000 free daily neurons on global edge</p>
                </div>
              </div>

              <a
                href="https://dash.cloudflare.com/?to=/:account/ai/workers-ai"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white text-[10px] font-bold shadow-md transition shrink-0"
              >
                <ExternalLink size={11} />
                GET KEY
              </a>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono pt-1">
              <span className="text-slate-400">Status:</span>
              <span className={`px-2 py-0.5 rounded-full border ${cfSet ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25" : "bg-slate-800 text-slate-400 border-white/5"}`}>
                {cfSet ? `Active (${cfAccountHint || "Connected"})` : "Not Configured"}
              </span>
            </div>

            <select
              value={cfModel}
              onChange={(e) => setCfModel(e.target.value)}
              className="w-full rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-cyan-400 font-mono transition"
            >
              <option value="@cf/meta/llama-3.3-70b-instruct">@cf/meta/llama-3.3-70b-instruct (Recommended)</option>
              <option value="@cf/deepseek-ai/deepseek-r1-distill-qwen-32b">@cf/deepseek-ai/deepseek-r1-distill-qwen-32b</option>
              <option value="@cf/meta/llama-3.1-8b-instruct">@cf/meta/llama-3.1-8b-instruct (Ultra Fast)</option>
              <option value="@cf/qwen/qwen2.5-7b-instruct">@cf/qwen/qwen2.5-7b-instruct (Multilingual)</option>
            </select>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <input
              type="text"
              value={cfAccountId}
              onChange={(e) => setCfAccountId(e.target.value)}
              placeholder="Account ID (e.g. 8f4a...)"
              className="w-full rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-400 font-mono placeholder-slate-600 transition"
            />
            <div className="flex gap-1.5">
              <input
                type="password"
                value={cfToken}
                onChange={(e) => setCfToken(e.target.value)}
                placeholder="Workers AI API Token"
                className="flex-1 min-w-0 rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-400 font-mono placeholder-slate-600 transition"
              />
              <button
                onClick={() => saveCloudflare()}
                disabled={cfBusy || (!cfAccountId.trim() && !cfSet)}
                className="flex items-center justify-center gap-1 rounded-lg bg-cyan-600 hover:brightness-110 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white shadow transition shrink-0"
              >
                {cfBusy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </button>
              {cfSet && (
                <button
                  onClick={() => saveCloudflare(true)}
                  disabled={cfBusy}
                  title="Clear Cloudflare credentials"
                  className="flex items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 px-2 py-1.5 text-xs text-slate-400 hover:text-rose-300 transition shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {cfMsg && (
              <div className={`text-[10px] font-mono px-2 py-1 rounded border ${cfMsg.ok ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-rose-500/10 text-rose-300 border-rose-500/20"}`}>
                {cfMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* 4. Mistral AI */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between shadow-xl space-y-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    Mistral AI
                    <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-orange-500/20 text-orange-300 font-mono">1B Tokens</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">1 Billion free tokens/month on Experiment tier</p>
                </div>
              </div>

              <a
                href="https://console.mistral.ai/api-keys"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-slate-950 text-[10px] font-bold shadow-md transition shrink-0"
              >
                <ExternalLink size={11} />
                GET KEY
              </a>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono pt-1">
              <span className="text-slate-400">Status:</span>
              <span className={`px-2 py-0.5 rounded-full border ${mistralSet ? "bg-orange-500/10 text-orange-400 border-orange-500/25" : "bg-slate-800 text-slate-400 border-white/5"}`}>
                {mistralSet ? `Active (${mistralHint})` : "Not Configured"}
              </span>
            </div>

            <select
              value={mistralModel}
              onChange={(e) => setMistralModel(e.target.value)}
              className="w-full rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-orange-400 font-mono transition"
            >
              <option value="mistral-small-latest">mistral-small-latest (Smart &amp; Fast - Recommended)</option>
              <option value="codestral-latest">codestral-latest (High Precision Reasoning)</option>
              <option value="mistral-large-latest">mistral-large-latest (Top Benchmark)</option>
              <option value="open-mistral-nemo">open-mistral-nemo (Free 12B Open Weights)</option>
            </select>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <div className="flex gap-1.5">
              <input
                type="password"
                value={mistralKey}
                onChange={(e) => setMistralKey(e.target.value)}
                placeholder="Paste Mistral API Key"
                className="flex-1 min-w-0 rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-orange-400 font-mono placeholder-slate-600 transition"
              />
              <button
                onClick={() => saveMistral()}
                disabled={mistralBusy || !mistralKey.trim()}
                className="flex items-center justify-center gap-1 rounded-lg bg-orange-500 hover:brightness-110 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-slate-950 shadow transition shrink-0"
              >
                {mistralBusy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </button>
              {mistralSet && (
                <button
                  onClick={() => saveMistral("")}
                  disabled={mistralBusy}
                  title="Clear Mistral key"
                  className="flex items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 px-2 py-1.5 text-xs text-slate-400 hover:text-rose-300 transition shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {mistralMsg && (
              <div className={`text-[10px] font-mono px-2 py-1 rounded border ${mistralMsg.ok ? "bg-orange-500/10 text-orange-300 border-orange-500/20" : "bg-rose-500/10 text-rose-300 border-rose-500/20"}`}>
                {mistralMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* 5. GitHub Models (Microsoft Azure) */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between shadow-xl space-y-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Bot size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    GitHub Models
                    <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">100% Free</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Azure GPT-4o-mini &amp; Llama 3.1 via GitHub PAT</p>
                </div>
              </div>

              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:brightness-110 text-white text-[10px] font-bold shadow-md transition shrink-0"
              >
                <ExternalLink size={11} />
                GET KEY
              </a>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono pt-1">
              <span className="text-slate-400">Status:</span>
              <span className={`px-2 py-0.5 rounded-full border ${ghSet ? "bg-purple-500/10 text-purple-400 border-purple-500/25" : "bg-slate-800 text-slate-400 border-white/5"}`}>
                {ghSet ? `Active (${ghHint})` : "Not Configured"}
              </span>
            </div>

            <select
              value={ghModel}
              onChange={(e) => setGhModel(e.target.value)}
              className="w-full rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-purple-400 font-mono transition"
            >
              <option value="gpt-4o-mini">gpt-4o-mini (OpenAI Precision - 100% Free via GitHub)</option>
              <option value="Meta-Llama-3.1-70B-Instruct">Meta-Llama-3.1-70B-Instruct (High Capacity)</option>
              <option value="Phi-3.5-mini-instruct">Phi-3.5-mini-instruct (Fast &amp; Lightweight)</option>
            </select>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <div className="flex gap-1.5">
              <input
                type="password"
                value={ghToken}
                onChange={(e) => setGhToken(e.target.value)}
                placeholder="ghp_... Paste GitHub Token (no scopes)"
                className="flex-1 min-w-0 rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-400 font-mono placeholder-slate-600 transition"
              />
              <button
                onClick={() => saveGitHub()}
                disabled={ghBusy || !ghToken.trim()}
                className="flex items-center justify-center gap-1 rounded-lg bg-purple-600 hover:brightness-110 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white shadow transition shrink-0"
              >
                {ghBusy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </button>
              {ghSet && (
                <button
                  onClick={() => saveGitHub(true)}
                  disabled={ghBusy}
                  title="Clear GitHub token"
                  className="flex items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 px-2 py-1.5 text-xs text-slate-400 hover:text-rose-300 transition shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {ghMsg && (
              <div className={`text-[10px] font-mono px-2 py-1 rounded border ${ghMsg.ok ? "bg-purple-500/10 text-purple-300 border-purple-500/20" : "bg-rose-500/10 text-rose-300 border-rose-500/20"}`}>
                {ghMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* 6. SambaNova Cloud */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between shadow-xl space-y-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Cpu size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    SambaNova Cloud
                    <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">400 T/s</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">100% Free permanent developer tier (~400 tokens/s)</p>
                </div>
              </div>

              <a
                href="https://cloud.sambanova.ai/apis"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white text-[10px] font-bold shadow-md transition shrink-0"
              >
                <ExternalLink size={11} />
                GET KEY
              </a>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono pt-1">
              <span className="text-slate-400">Status:</span>
              <span className={`px-2 py-0.5 rounded-full border ${sambaSet ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" : "bg-slate-800 text-slate-400 border-white/5"}`}>
                {sambaSet ? `Active (${sambaHint})` : "Not Configured"}
              </span>
            </div>

            <select
              value={sambaModel}
              onChange={(e) => setSambaModel(e.target.value)}
              className="w-full rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-emerald-400 font-mono transition"
            >
              <option value="Meta-Llama-3.3-70B-Instruct">Meta-Llama-3.3-70B-Instruct (Recommended)</option>
              <option value="Qwen2.5-72B-Instruct">Qwen2.5-72B-Instruct (Multilingual Reasoning)</option>
              <option value="Meta-Llama-3.1-8B-Instruct">Meta-Llama-3.1-8B-Instruct (Sub-second Instant)</option>
            </select>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <div className="flex gap-1.5">
              <input
                type="password"
                value={sambaKey}
                onChange={(e) => setSambaKey(e.target.value)}
                placeholder="Paste SambaNova API Key"
                className="flex-1 min-w-0 rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-400 font-mono placeholder-slate-600 transition"
              />
              <button
                onClick={() => saveSambaNova()}
                disabled={sambaBusy || !sambaKey.trim()}
                className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:brightness-110 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white shadow transition shrink-0"
              >
                {sambaBusy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </button>
              {sambaSet && (
                <button
                  onClick={() => saveSambaNova("")}
                  disabled={sambaBusy}
                  title="Clear SambaNova key"
                  className="flex items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 px-2 py-1.5 text-xs text-slate-400 hover:text-rose-300 transition shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {sambaMsg && (
              <div className={`text-[10px] font-mono px-2 py-1 rounded border ${sambaMsg.ok ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-rose-500/10 text-rose-300 border-rose-500/20"}`}>
                {sambaMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* 7. Together AI */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col justify-between shadow-xl space-y-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
                  <Cloud size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    Together AI
                    <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-pink-500/20 text-pink-300 font-mono">Trial Credits</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Free open-source trial models (DeepSeek &amp; Llama)</p>
                </div>
              </div>

              <a
                href="https://api.together.xyz/settings/api-keys"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-pink-500 to-rose-600 hover:brightness-110 text-white text-[10px] font-bold shadow-md transition shrink-0"
              >
                <ExternalLink size={11} />
                GET KEY
              </a>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono pt-1">
              <span className="text-slate-400">Status:</span>
              <span className={`px-2 py-0.5 rounded-full border ${togetherSet ? "bg-pink-500/10 text-pink-400 border-pink-500/25" : "bg-slate-800 text-slate-400 border-white/5"}`}>
                {togetherSet ? `Active (${togetherHint})` : "Not Configured"}
              </span>
            </div>

            <select
              value={togetherModel}
              onChange={(e) => setTogetherModel(e.target.value)}
              className="w-full rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-pink-400 font-mono transition"
            >
              <option value="deepseek-ai/DeepSeek-V3">deepseek-ai/DeepSeek-V3 (Recommended)</option>
              <option value="meta-llama/Llama-3.3-70B-Instruct-Turbo">meta-llama/Llama-3.3-70B-Instruct-Turbo</option>
              <option value="mistralai/Mixtral-8x7B-Instruct-v0.1">mistralai/Mixtral-8x7B-Instruct-v0.1 (MoE)</option>
            </select>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <div className="flex gap-1.5">
              <input
                type="password"
                value={togetherKey}
                onChange={(e) => setTogetherKey(e.target.value)}
                placeholder="Paste Together API Key"
                className="flex-1 min-w-0 rounded-lg bg-slate-900/90 border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-pink-400 font-mono placeholder-slate-600 transition"
              />
              <button
                onClick={() => saveTogether()}
                disabled={togetherBusy || !togetherKey.trim()}
                className="flex items-center justify-center gap-1 rounded-lg bg-pink-600 hover:brightness-110 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white shadow transition shrink-0"
              >
                {togetherBusy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </button>
              {togetherSet && (
                <button
                  onClick={() => saveTogether("")}
                  disabled={togetherBusy}
                  title="Clear Together key"
                  className="flex items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 px-2 py-1.5 text-xs text-slate-400 hover:text-rose-300 transition shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {togetherMsg && (
              <div className={`text-[10px] font-mono px-2 py-1 rounded border ${togetherMsg.ok ? "bg-pink-500/10 text-pink-300 border-pink-500/20" : "bg-rose-500/10 text-rose-300 border-rose-500/20"}`}>
                {togetherMsg.text}
              </div>
            )}
          </div>
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
    name: "DigiBiz OS",
    label: "digibizos.co.uk",
    url: "https://digibizos.co.uk/",
    color: "amber",
    bgHover: "hover:border-amber-500/40 hover:bg-amber-500/10",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
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
            <a href="https://www.digiformation.co.uk/" target="_blank" rel="noreferrer" title="Digiformation Ltd">
              <img
                src={digiformationLogo}
                alt="Digi WhatsApp Agent"
                className="w-16 h-16 rounded-2xl object-contain bg-[#020a05] p-1 border-2 border-emerald-500/40 shadow-xl shadow-emerald-500/20 hover:scale-105 transition shrink-0"
              />
            </a>
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

      {/* Flagship Ecosystem Platform: DIGI BIZ OS */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ⚡ Flagship Business Operating System
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              3-Day Free Trial
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-white">DIGI BIZ OS — Sovereign AI Business Platform</h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Run your complete business offline and online: 20+ Free AI models, automated WhatsApp sales agent, local CRM, customer invoicing, document engine, and lifetime updates for £29 once.
          </p>
        </div>

        <a
          href="https://www.digibizos.co.uk/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 hover:shadow-emerald-500/20 transition-all shrink-0 hover:scale-105 no-underline"
        >
          <span>🚀</span>
          <span>Try DIGI BIZ OS Free</span>
          <ExternalLink size={14} />
        </a>
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
/* MAIN APPLICATION LAYOUT (DIGI LABS SHELL & THEMING)                       */
/* ────────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState<"whatsapp" | "logs" | "settings" | "about">("whatsapp");

  const handleMinimize = () => {
    try {
      const e = (window as any).electron || (window as any).studio;
      e?.minimize?.();
    } catch { }
  };

  const handleMaximize = () => {
    try {
      const e = (window as any).electron || (window as any).studio;
      e?.maximize?.();
    } catch { }
  };

  const handleClose = () => {
    try {
      const e = (window as any).electron || (window as any).studio;
      e?.close?.();
    } catch { }
  };

  return (
    <div className="shell">
      {/* ── Frameless Studio Topbar ── */}
      <header className="topbar">
        {/* Brand */}
        <div className="brand">
          <div className="brand-mark">
            <img src={digiformationLogo} alt="Digi WhatsApp Agent" />
          </div>
          <div>
            <div className="brand-title">Digi WhatsApp Agent</div>
            <div className="brand-sub">Autonomous Sales Assistant</div>
          </div>
        </div>

        <div className="flex-1" />

        {/* Studio Section Tabs (Clean, Spaced DIGI LABS Pill Design) */}
        <nav className="tabs" role="tablist" aria-label="Studio sections">
          <button
            onClick={() => setTab("whatsapp")}
            className={`tab ${tab === "whatsapp" ? "active" : ""}`}
            role="tab"
            aria-selected={tab === "whatsapp"}
          >
            <Smartphone size={13} />
            <span>WhatsApp Agent</span>
          </button>
          <button
            onClick={() => setTab("logs")}
            className={`tab ${tab === "logs" ? "active" : ""}`}
            role="tab"
            aria-selected={tab === "logs"}
          >
            <Activity size={13} />
            <span>Live Logs</span>
          </button>
          <button
            onClick={() => setTab("settings")}
            className={`tab ${tab === "settings" ? "active" : ""}`}
            role="tab"
            aria-selected={tab === "settings"}
          >
            <Bot size={13} />
            <span>AI Engine</span>
          </button>
          <button
            onClick={() => setTab("about")}
            className={`tab ${tab === "about" ? "active" : ""}`}
            role="tab"
            aria-selected={tab === "about"}
          >
            <Info size={13} />
            <span>About</span>
          </button>
        </nav>

        {/* Try DIGI BIZ OS Action Button */}
        <a
          href="https://www.digibizos.co.uk/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-400/40 hover:border-emerald-400/80 shadow-[0_0_16px_-2px_rgba(16,185,129,0.35)] transition-all transform hover:-translate-y-0.5 text-white text-xs font-bold shrink-0 no-underline cursor-pointer"
          title="Try DIGI BIZ OS - Claim 3-Day Free Trial"
        >
          <span className="text-emerald-400 text-xs">⚡</span>
          <span>Try DIGI BIZ OS</span>
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
            Free Trial
          </span>
        </a>

        {/* Window controls (frameless topbar) */}
        <div className="win-controls">
          <button onClick={handleMinimize} className="wc" aria-label="Minimize" title="Minimize">–</button>
          <button onClick={handleMaximize} className="wc" aria-label="Maximize" title="Maximize">□</button>
          <button onClick={handleClose} className="wc wc-close" aria-label="Close" title="Close">✕</button>
        </div>
      </header>

      {/* ── Main Work Area (Zero Window Scrollbar, Single-Pane Fit) ── */}
      <main className="flex-1 overflow-hidden min-h-0 p-2 sm:p-2.5 w-full max-w-[1600px] mx-auto flex flex-col">
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

      {/* ── Persistent Rounded App Foot ── */}
      <footer className="appfoot">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-white font-bold">Digi WhatsApp Agent</span>
          <span className="opacity-40">·</span>
          <span className="text-slate-400">by DigiFormation Ltd (UK #16994903)</span>
        </div>
        <div className="flex-1" />
        <a
          href="https://www.digibizos.co.uk/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 text-xs transition-colors no-underline mr-4"
          title="Try DIGI BIZ OS - Claim 3-Day Free Trial"
        >
          <span>🚀</span>
          <span><strong>Try DIGI BIZ OS</strong> (3-Day Free Trial)</span>
          <span>↗</span>
        </a>
        <div className="flex items-center gap-4 text-xs">
          <a href="https://www.digiformation.co.uk/" target="_blank" rel="noreferrer">Website</a>
          <a href="https://linktr.ee/digiformationltd" target="_blank" rel="noreferrer">Portals</a>
          <span className="text-slate-500 font-mono">v2.0 PRO</span>
        </div>
      </footer>
    </div>
  );
}