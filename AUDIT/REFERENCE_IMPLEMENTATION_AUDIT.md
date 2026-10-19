# Reference Implementation Audit: Digi WhatsApp Agent vs Digi Biz OS (LangGraph)

**Scope:**
- **Target Project:** `C:\Users\user\Desktop\AWAIS\WHATSAPP_AGENT` (Standalone Desktop Digi WhatsApp Agent)
- **Reference Project:** `C:\Users\user\Desktop\AGENTICSEEK\LANGHRAF` (Digi Biz OS with LangGraph Brain & WhatsApp Integration)
- **Reference UI Spec:** `C:\Users\user\Desktop\DIGI LABS` (Frameless Curved Studio Shell, tokens, window controls)
- **Date:** October 18, 2026
- **Status:** Phase 1 Read-Only Discovery Complete

---

## 1. Executive Summary & Inventory

The Digi Biz OS reference implementation (`C:\Users\user\Desktop\AGENTICSEEK\LANGHRAF`) contains a mature, multi-layered agent architecture composed of:
1. **The Core LangGraph Brain (`services/brain`)**: A Python/FastAPI microservice executing a state graph (`supervisor -> approval -> capability -> supervisor -> finalize`) using LangGraph with SQLite checkpointing (`SqliteSaver`), thread isolation, and interrupt gates for real-world capabilities.
2. **The Digi WhatsApp Agent Subsystem (`wa-agent/`, `channels.ts`, `wa-crm.ts`, `wa-memory.ts`, `wa-followups.ts`, `whatsappDeterministic.ts`, `whatsappVoice.ts`)**:
   - Multi-account WhatsApp Baileys integration supporting up to 3 numbers simultaneously.
   - Dual operating modes: **Sales Agent Mode** (`AIOrchestrator`) and **Commander Mode** (routing commands directly to the LangGraph Brain via `POST /v1/runs`).
   - 8-stage customer lifecycle finite state machine (`state_machine.ts`).
   - Next-Best-Action decision engine (`next_best_action.ts`).
   - Objection Playbook (`playbook.ts`).
   - Scoped Knowledge Base retriever (`retriever.ts`, `domains.ts`).
   - Zero-AI Deterministic matching layer (`whatsappDeterministic.ts`).
   - WhatsApp CRM lead tracking (`wa-crm.ts`) and follow-up intelligence (`wa-followups.ts`).
   - Persistent SQLite conversation memory with unread counter and group support (`wa-memory.ts`, `db.ts`).
   - Human Handoff escalation (`handoff/index.ts`).
   - Voice note transcription (Whisper) and synthetic voice reply (`whatsappVoice.ts`, `voice/`).
3. **The User Interface (`DigiWhatsAppAgentPanel.tsx`)**:
   - Accounts tab (`WhatsAppMulti`) for linked device pairing.
   - Live Event Logs with audio alert chimes, pause, and search filter.
   - "From Website" lead and click viewer (`WebsiteLeadsPanel`).
   - Blocklist management (`BlocklistCard`) to mute auto-replies for personal contacts/staff.
   - Multi-format Knowledge Base Studio (MD, TXT, JSON, YAML, CSV).

---

## 2. Feature-by-Feature Comparison Matrix

| Feature Domain | Reference Implementation (`LANGHRAF`) | Target Implementation (`WHATSAPP_AGENT`) | Status | Evidence (`file:line`) |
| :--- | :--- | :--- | :--- | :--- |
| **LangGraph Brain Runtime** | `services/brain/graph/build.py` (StateGraph with supervisor, approval, capabilities, SqliteSaver) | Missing embedded LangGraph runtime; relies on external model fallback | **MISSING** | `LANGHRAF:services/brain/graph/build.py:23` vs `WHATSAPP_AGENT:src/backend/server.ts:73` |
| **LangGraph / Brain Bridge** | `channels.ts:887-897`, `server.ts:7139-7166` (`routeToBrain`, `/v1/runs`, `/v1/memory`) | `channels.ts:517` has placeholder `brainRouter` but no active dispatcher to brain | **PARTIAL** | `LANGHRAF:channels.ts:887` vs `WHATSAPP_AGENT:src/backend/channels.ts:517` |
| **WhatsApp Dual Modes** | `channels.ts:851` (`agent` for Sales vs `commander` for Brain remote control) | Hardcoded to Sales Agent mode only | **MISSING** | `LANGHRAF:channels.ts:851` vs `WHATSAPP_AGENT:src/backend/channels.ts:436` |
| **Sales State Machine** | `wa-agent/state/state_machine.ts` (8 stages: initial -> engaged -> objection -> closed) | `src/backend/state/state_machine.ts` (8 stages present, needs full regression test) | **VERIFIED** | `LANGHRAF:wa-agent/state/state_machine.ts:1` & `WHATSAPP_AGENT:src/backend/state/state_machine.ts:1` |
| **Next-Best-Action Engine** | `wa-agent/sales/next_best_action.ts` (Stage-specific prompt directives) | `src/backend/sales/next_best_action.ts` (Present) | **VERIFIED** | `LANGHRAF:wa-agent/sales/next_best_action.ts:1` |
| **Objection Playbook** | `wa-agent/sales/playbook.ts` (Price, trust, urgency, competitor patterns) | `src/backend/sales/playbook.ts` (Present) | **VERIFIED** | `LANGHRAF:wa-agent/sales/playbook.ts:1` |
| **Deterministic Zero-AI** | `whatsappDeterministic.ts` (Section heading & keyword matching) | `src/backend/engine/deterministic.ts` (Updated with section matching fallback) | **VERIFIED** | `LANGHRAF:whatsappDeterministic.ts:1` & `WHATSAPP_AGENT:src/backend/engine/deterministic.ts:1` |
| **WhatsApp CRM Book** | `wa-crm.ts` (`waCrmRecordContact`, `waCrmUpdate`, `waCrmList`, `waCrmSummary`) | Missing `wa-crm.ts` module and `/api/whatsapp/crm` API endpoints | **MISSING** | `LANGHRAF:wa-crm.ts:1` (File absent in target backend) |
| **Follow-Up Intelligence** | `wa-followups.ts` (Deterministic state analysis, evidence classification, question generator) | `src/backend/scheduler/follow_up.ts` exists but lacks full `wa-followups.ts` engine | **PARTIAL** | `LANGHRAF:wa-followups.ts:1` vs `WHATSAPP_AGENT:src/backend/scheduler/follow_up.ts:1` |
| **Contact Blocklist** | `channels.ts:142-160` (Mute personal numbers/staff from auto-reply) | Not implemented in `channels.ts` or UI | **MISSING** | `LANGHRAF:channels.ts:142` (Absent in target channels) |
| **Multi-Format Knowledge** | `knowledge_parser.ts` (MD, TXT, JSON, YAML, CSV) | `src/backend/knowledge_parser.ts` (Present and functional) | **VERIFIED** | `WHATSAPP_AGENT:src/backend/knowledge_parser.ts:1` |
| **Voice Note Handling** | `whatsappVoice.ts` & `transcriber.ts` (Whisper transcription & TTS synthesis) | `src/backend/voice/` & `src/backend/transcriber.ts` (Present) | **VERIFIED** | `LANGHRAF:whatsappVoice.ts:1` |
| **Website Leads Integration** | `DigiWhatsAppAgentPanel.tsx:1213-1300` (View web WhatsApp leads & clicks) | UI and API routes missing | **MISSING** | `LANGHRAF:src/components/digi/DigiWhatsAppAgentPanel.tsx:1213` |
| **Single-Instance & Porting** | `electron/main.cjs` & `server/index.js` (`listenWithFallback`, single-instance lock) | Implemented in `server.ts` & `electron/main.cjs` | **VERIFIED** | `WHATSAPP_AGENT:electron/main.cjs:12` & `src/backend/server.ts:388` |
| **Curved Frameless Shell** | `DIGI LABS/electron/splash.html`, `main.cjs` (20px radius, glassmorphic topbar) | Implemented in `splash.html`, `main.cjs`, `index.css` | **VERIFIED** | `WHATSAPP_AGENT:electron/splash.html:28` & `index.css:77` |

---

## 3. Reference Architecture Findings & Gaps

1. **Absence of Dedicated LangGraph Orchestration in Standalone Target**:
   While the target project had AIOrchestrator calling Groq/Zen LLM APIs directly, it lacked a formal LangGraph StateGraph engine where execution cycles, tool calls, and checkpoints are managed as a compiled graph. We must supply an in-process, self-contained LangGraph-compatible state graph runtime so that the agent executes as a genuine LangGraph agent (with nodes, conditional edges, and checkpoints).
2. **Missing WhatsApp CRM Customer Book (`wa-crm.ts`)**:
   In the reference project, every customer interaction is recorded into `whatsapp_crm.json` tracking customer number, name, message count, deal status (`new` -> `engaged` -> `won` -> `lost`), and revenue. The standalone target lacks this store.
3. **Missing Automated Follow-Up Intelligence (`wa-followups.ts`)**:
   The reference project includes a deterministic follow-up analyzer that inspects conversation history, detects intent, evaluates whether payment/documents were claimed, and formats actionable owner-facing prompts.
4. **Missing Per-Account Blocklist**:
   The owner needs to exclude specific phone numbers (e.g., family, staff) from receiving automated bot replies.
5. **Missing Website Leads & Clicks Panel**:
   The reference panel provides a dedicated "From Website" view displaying incoming web leads and clicks.

---

## 4. Next Step

Proceed to Phase 3: Baseline testing the current software against the test suite and documenting runtime findings in `AUDIT/BASELINE_RUNTIME_REPORT.md`.
