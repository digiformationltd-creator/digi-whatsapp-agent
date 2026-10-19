# Implementation Parity Matrix: Digi WhatsApp Agent

**Reference Source:** `C:\Users\user\Desktop\AGENTICSEEK\LANGHRAF`  
**Target Project:** `C:\Users\user\Desktop\AWAIS\WHATSAPP_AGENT`  
**Date:** October 18, 2026  

---

## 1. Traceable Feature Parity Matrix

| Feature | Reference Implementation | Target Implementation | Status | Gap | Required Change | Acceptance Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LangGraph StateGraph Engine** | `services/brain/graph/build.py` (StateGraph with supervisor, approval, capabilities, SqliteSaver) | Missing in `src/backend` | **MISSING** | No graph orchestration; direct procedural LLM calls | Implement native TypeScript `LangGraphEngine` (`src/backend/engine/langgraph_agent.ts`) with nodes: `supervisor`, `tool_execution`, `finalize`, state schema, and checkpoint persistence | Unit test graph compilation, multi-turn state preservation, and routing |
| **WhatsApp CRM Book** | `LANGHRAF/wa-crm.ts` (`waCrmRecordContact`, `waCrmList`, `waCrmUpdate`, `waCrmSummary`) | None | **MISSING** | CRM contacts, deal pipeline (`new`, `engaged`, `won`, `lost`), and revenue not saved | Port `src/backend/crm/wa_crm.ts` and expose `/api/whatsapp/crm` API routes | Record contact on message, query CRM summary via API, verify JSON persistence |
| **Follow-Up Intelligence** | `LANGHRAF/wa-followups.ts` (Deterministic state, intent, evidence, question generation) | Basic timer in `scheduler/follow_up.ts` | **PARTIAL** | Missing intent detection (price, order, paid, docs) and follow-up generation | Implement `src/backend/scheduler/followup_engine.ts` using `wa-followups.ts` logic | Test follow-up generation against mock chat histories |
| **Contact Blocklist** | `LANGHRAF/channels.ts:142-160` (`getWhatsappBlocklist`, `isWhatsappBlocked`) | None | **MISSING** | Bot replies to all non-group messages; cannot exclude personal numbers | Add blocklist functions to `channels.ts` and `/api/whatsapp/blocklist` endpoints | Add number to blocklist, verify incoming message is ignored with "blocked" log |
| **Dual Mode Routing (Agent vs Commander)** | `LANGHRAF/channels.ts:851-897` (`agent` vs `commander`) | Only Agent mode implemented | **PARTIAL** | Cannot switch to Commander mode or delegate to LangGraph Brain | Add `getWhatsappMode`/`setWhatsappMode` in `channels.ts` and wire Commander branch to LangGraph engine | Toggle mode to commander, send command, verify LangGraph run triggers |
| **Website Leads & Clicks Panel** | `LANGHRAF/src/components/digi/DigiWhatsAppAgentPanel.tsx:1213-1300` | None | **MISSING** | No UI tab or API for website WhatsApp lead analytics | Expose `/api/crm/web_whatsapp` & `/api/crm/whatsapp_clicks` in `server.ts` and add "From Website" view in `App.tsx` | Fetch website leads in UI, verify empty/populated table render |
| **Live Event WebSocket & Logs** | `LANGHRAF/live_events.ts` & `DigiWhatsAppAgentPanel.tsx:LogsPanel` | Target has WS but lacks rich audio cues and filter controls in UI | **PARTIAL** | UI lacks audio toggle and full event filtering | Enhance Logs tab in `App.tsx` with sound effects and filter controls | Emit event over WS, verify live appearance in UI log list |
| **Frameless Studio Theming** | `DIGI LABS/electron/splash.html`, `main.cjs` | Shell curved, splash has 20px radius and fail-safe | **VERIFIED** | Solved in previous turn | Maintain clean, non-blocking splash and frameless topbar | Launch app, verify rounded corners and 0ms loading stall |

---

## 2. Implementation Action Plan

1. **Step 1: Implement LangGraph Agent Engine (`src/backend/engine/langgraph_agent.ts`)**:
   - Create a typed `AgentState` schema: `messages`, `stage`, `customerId`, `jid`, `plan`, `tools_called`, `final_reply`, `status`.
   - Implement nodes:
     - `supervisor_node`: Evaluates customer intent, inspects state machine & memory, selects tool or decides completion.
     - `tool_execution_node`: Executes scoped KB retrieval, deterministic lookup, CRM queries, or human handoff.
     - `finalize_node`: Frames final prompt, generates LLM reply, sanitizes output.
   - Compile graph with conditional edge routing.
   - Connect checkpoint persistence to SQLite `data/agent_memory.db`.
2. **Step 2: Port WhatsApp CRM Customer Book (`src/backend/crm/wa_crm.ts`)**:
   - Implement `waCrmRecordContact(number, name)`, `waCrmUpdate`, `waCrmList`, `waCrmSummary`.
   - Wire into `channels.ts` so every customer interaction automatically records or updates their CRM contact profile.
   - Expose `/api/whatsapp/crm` endpoints.
3. **Step 3: Port Follow-Up Intelligence (`src/backend/scheduler/followup_engine.ts`)**:
   - Implement deterministic intent classifier (price, order, payment, documents).
   - Generate prioritized follow-up suggestions (`HIGH`, `MEDIUM`, `LOW`) with evidence tags (`FACT`, `INFERENCE`, `UNKNOWN`).
   - Expose `/api/whatsapp/followups` endpoints.
4. **Step 4: Implement Per-Account Blocklist in `channels.ts`**:
   - `getWhatsappBlocklist(id)`, `setWhatsappBlocklist(id, list)`, `isWhatsappBlocked(phone, id)`.
   - Expose `/api/whatsapp/blocklist` GET and POST routes.
5. **Step 5: Add Dual Operating Modes (`agent` vs `commander`)**:
   - Add `whatsapp_mode_{id}.flag` persistence.
   - Wire Commander mode into `LangGraphEngine.run()`.
6. **Step 6: Update UI (`src/frontend/App.tsx`) with Website Leads, CRM, and Blocklist**:
   - Add "From Website" panel (`web_whatsapp` chats & `whatsapp_clicks`).
   - Add CRM Leads summary counter.
   - Add Contact Blocklist management card inside the WhatsApp tab.
