# Baseline Runtime Report: Digi WhatsApp Agent

**Test Execution Date:** October 18, 2026  
**Environment:** Windows 10 x64, Node.js v22.14.0, Electron v43.1.0  
**Project Path:** `C:\Users\user\Desktop\AWAIS\WHATSAPP_AGENT`  

---

## 1. System Component Status

| Component | Test Executed | Exit Code / Result | Status | Observed Findings |
| :--- | :--- | :--- | :--- | :--- |
| **Dependencies** | `npm list --depth=0` | Code 0 | **VERIFIED** | All runtime dependencies installed cleanly (`@whiskeysockets/baileys`, `express`, `ws`, `tesseract.js`, `lucide-react`, `react`, `react-dom`). |
| **Backend Startup** | `node dist/backend/server.cjs` | Code 0 | **VERIFIED** | Starts in 826ms, binds `127.0.0.1:9010` with automatic `listenWithFallback` stepping up if port is occupied. |
| **Frontend Startup** | `npm run build` (Vite) | Code 0 | **VERIFIED** | Compiles `dist/frontend` (507 KB JS, 32 KB CSS) with non-blocking Google Fonts. |
| **API Health** | `GET /api/health` | Code 0 (HTTP 200) | **VERIFIED** | Returns `{"ok": true, "service": "whatsapp-agent"}` in under 3ms. |
| **Multi-Account API** | `GET /api/whatsapp/list` | Code 0 (HTTP 200) | **VERIFIED** | Returns `{ok: true, max: 3, accounts: [...]}`. |
| **Memory Foundation** | `npx tsx scripts/test_memory_phase1.ts` | Code 0 (7/7 Passed) | **VERIFIED** | Identity resolution, SQLite rolling window, fact extraction, and cross-customer isolation verified. |
| **Multi-Industry Plug-and-Play** | `npx tsx scripts/test_generic_multi_industry.ts` | Code 0 (9/9 Passed) | **VERIFIED** | Successfully decoupled across Restaurant, Real Estate, and E-Commerce domains. |
| **AI-Off Deterministic** | `npx tsx scripts/ai_off_forensic_test.ts` | 15/16 Passed | **PARTIAL** | Verification link fell back to safe fallback instead of direct URL because knowledge doc lacked specific URL. |
| **Master 10 Phases Test** | `npx tsx scripts/test_master_10_phases.ts` | 6/11 Passed | **PARTIAL** | Fails in scoped knowledge retrieval and profile getters when generic business template is loaded. |
| **LangGraph Agent Runtime** | Inspection of `src/backend/engine` | Not Compiled | **MISSING** | Target project currently runs direct procedural calls instead of a compiled LangGraph `StateGraph`. |
| **WhatsApp CRM Store** | Inspection of `src/backend/channels.ts` | Not Implemented | **MISSING** | `wa-crm.ts` is absent; customer message counts, sales pipeline status, and revenue are not recorded. |
| **Follow-Up Intelligence** | Inspection of `src/backend/scheduler` | Partial | **PARTIAL** | Basic timer exists, but deterministic intent extraction and CRM cross-checking from `wa-followups.ts` are absent. |
| **Account Blocklist** | Inspection of `src/backend/channels.ts` | Not Implemented | **MISSING** | No blocklist storage or check to mute auto-replies for personal numbers. |
| **Website Leads Integration** | Inspection of `src/frontend/App.tsx` | Not Implemented | **MISSING** | No "From Website" lead and click viewing tab. |

---

## 2. Root Cause Analysis of Gaps

1. **No LangGraph State Graph in Standalone Build**:
   The reference Digi Biz OS relies on `services/brain/graph/build.py`, compiling a LangGraph `StateGraph` with supervisor, capability, and finalize nodes. The standalone WhatsApp agent was relying on a simple procedural `AIOrchestrator.generateReply()` method without a graph lifecycle.
2. **Missing WhatsApp CRM Module (`wa-crm.ts`)**:
   `LANGHRAF` contains `wa-crm.ts` storing contacts in `whatsapp_crm.json`. This was omitted during the initial extraction of `WHATSAPP_AGENT`.
3. **Missing Follow-Up Intelligence Engine (`wa-followups.ts`)**:
   `LANGHRAF` contains a 462-line deterministic follow-up classifier that detects customer intent (price, order, payment, docs) and generates prioritized follow-up prompts.
4. **Missing Blocklist API & UI**:
   In `LANGHRAF:channels.ts:142`, `getWhatsappBlocklist(id)` and `isWhatsappBlocked(phone, id)` prevent the bot from auto-messaging internal company numbers. This was not ported.
5. **Missing Website Leads Panel**:
   In `LANGHRAF:DigiWhatsAppAgentPanel.tsx:1213`, a "From Website" tab visualizes `web_whatsapp` chats and `whatsapp_clicks`.

---

## 3. Baseline Conclusion

The baseline application is stable at the infrastructural level (bundler, HTTP server, Baileys socket, SQLite memory), but requires:
1. An embedded, native TypeScript **LangGraph Agent Runtime** (`StateGraph`) with state management, supervisor decision-making, and checkpointing.
2. Porting the reference `wa-crm.ts`, `wa-followups.ts`, and contact blocklist.
3. Adding the "From Website" and CRM endpoints and UI panels.
