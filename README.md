# 🚀 Universal WhatsApp Sales Agent

> **An autonomous, production-ready AI Sales Agent & Conversational Engine for WhatsApp.**  
> Powered by Baileys WhatsApp Web protocol, local SQLite memory, deterministic Finite State Machines, and ultra-fast LLM orchestration (Groq / OpenCode Zen).

---

## 🌟 Key Features

* **📱 Multi-Account WhatsApp Pairing:** Connect multiple WhatsApp accounts simultaneously using direct QR code pairing via `@whiskeysockets/baileys` without paying expensive Business API per-conversation fees.
* **🧠 Decoupled Universal Business Knowledge (RAG):** 100% business-agnostic. Drop your company profile, pricing tables, services, and FAQs into `/knowledge/*.md` files and the agent instantly sells for your business.
* **⚡ 0ms Deterministic Response Layer:** Instant Zero-AI fallback for standard inquiries (office hours, verification links, package lists). If external AI models go offline, the agent continues serving customers seamlessly.
* **🎙️ Voice Note Transcription (Whisper STT):** Inbound voice messages are automatically transcribed via Groq Whisper and answered in clean, authentic Pakistani Roman Urdu or English.
* **📊 8-Stage Sales Pipeline State Machine:** Deterministic Finite State Machine (`NEW` ➔ `GREETED` ➔ `QUALIFIED` ➔ `PACKAGE_SELECTED` ➔ `ORDER_INITIATED` ➔ `DOCUMENTS_PENDING` ➔ `COMPLETED`) ensuring structured sales conversations and Next-Best-Action (NBA) directives.
* **💾 Local SQLite Memory & Fact Extraction:** Automatically remembers customer names, locations, selected packages, and order references across sessions in a native zero-dependency SQLite database.
* **🛡️ Zero Hallucination & Discount Protection:** Strict pricing integrity rules enforce exact listed package prices and polite negotiation defense.
* **👨‍💼 Human Escalation & Follow-up Scheduler:** Automatically routes complex high-value deals to human managers and identifies stale leads for 24-hour follow-up messages.
* **💻 Modern Real-time Dashboard:** Built with React 19, TailwindCSS, Lucide icons, and live WebSocket event streams (`/ws/events`).

---

## 🏗️ Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │     Incoming WhatsApp Message (Text/Voice)   │
                      └───────────────────┬────────────────────┘
                                          │
                        ┌─────────────────▼─────────────────┐
                        │   1. Media & Whisper Transcriber  │
                        └─────────────────┬─────────────────┘
                                          │
                        ┌─────────────────▼─────────────────┐
                        │   2. SQLite Memory & Fact Store   │
                        └─────────────────┬─────────────────┘
                                          │
                        ┌─────────────────▼─────────────────┐
                        │   3. Deterministic State Machine  │
                        └─────────────────┬─────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                           │
         [Factual Template Match?]                   [Conversational Reasoning]
                    │                                           │
                    ▼                                           ▼
      ┌───────────────────────────┐               ┌───────────────────────────┐
      │ 4. Deterministic Engine   │               │ 5. Scoped RAG Retriever   │
      │    (0ms Instant Reply)    │               │    (Intent Domain Slice)  │
      └─────────────┬─────────────┘               └─────────────┬─────────────┘
                    │                                           │
                    │                             ┌─────────────▼─────────────┐
                    │                             │ 6. Cloud LLM Orchestrator │
                    │                             │    (Groq 120B / OpenCode) │
                    │                             └─────────────┬─────────────┘
                    │                                           │
                    └─────────────────────┬─────────────────────┘
                                          │
                        ┌─────────────────▼─────────────────┐
                        │ 7. Sanitizer & Clean Outbound WA  │
                        └───────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v20.x or v22.x+ (Recommended: Node v22 LTS with built-in `node:sqlite`)
- A WhatsApp number for scanning and connecting

### 1. Clone the Repository
```bash
git clone https://github.com/digiformationltd-creator/OPEN-WHATSAPP-AGENT-BY-DIGIFORMATION-LTD-.git
cd OPEN-WHATSAPP-AGENT-BY-DIGIFORMATION-LTD-
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` and add your free API keys:
```env
PORT=9010
GROQ_API_KEY=gsk_your_groq_key_here
WHATSAPP_AGENT_KEY=your_opencode_zen_key_here
```
> 💡 **Get Free Keys:**
> - [Groq Console](https://console.groq.com/keys) (Free ultra-fast Llama & Whisper models)
> - [OpenCode Zen](https://opencode.ai) (Free backup reasoning models)

### 4. Start the Agent

#### Option A: 1-Click Startup (Windows)
Simply double-click **`start.bat`** or **`start-whatsapp-agent.bat`**. It will automatically install dependencies, build, and open the browser!

#### Option B: Terminal / Command Line
```bash
npm run dev
# or for production:
npm run build && npm start
```
Open **http://localhost:9010** in your browser.

### 5. Pair WhatsApp
1. On your phone, open WhatsApp ➔ **Linked Devices** ➔ **Link a device**.
2. Click **Connect** on the dashboard and scan the generated QR code.
3. The agent is now live and ready to handle customer inquiries 24/7!

---

## 📁 Customizing for Your Business

You can customize the entire business personality and product catalog simply by editing the Markdown files in the `knowledge/` directory (refer to `sample_knowledge/` for examples):

| Knowledge File | Purpose & Contents |
| :--- | :--- |
| **`knowledge/company-profile.md`** | Company name, official office address, timings, and contact details |
| **`knowledge/packages-pricing.md`** | Pricing tables, package tiers, inclusions, and timelines |
| **`knowledge/services.md`** | Overview of all business offerings and specialties |
| **`knowledge/faq.md`** | Common customer questions and verified answers |
| **`knowledge/documents-kyc.md`** | Onboarding requirements, ID verification links, and checklists |

---

## 🛠️ Available NPM Scripts

- `npm run dev` — Starts the backend server and Vite frontend in development mode.
- `npm run build` — Compiles frontend and backend bundles for production (`dist/`).
- `npm start` — Starts the production server.
- `npm run test` — Executes the 16-point automated architectural verification test suite.

---

## 🔒 Security & Privacy

- **No Remote Database Leakage:** All customer conversation memory and state transitions are stored locally on your server in SQLite (`data/agent_memory.db`).
- **Private Conversations Only:** Built-in safeguards automatically ignore and block WhatsApp group chats.
- **Data Protection:** No credentials, sessions, or private databases are committed to version control.

---

## 🏢 Owner & Company Information

Developed and maintained by **Digiformation Ltd** (UK Company Registration # 16994903).

- 🌐 **Official Website:** [www.digiformation.co.uk](https://www.digiformation.co.uk/)
- ✉️ **Official Email:** [info@digiformation.co.uk](mailto:info@digiformation.co.uk)
- 📱 **WhatsApp & Direct Call:** [+92 316 446 7464](https://wa.me/923164467464)
- 🔗 **Linktree Hub:** [linktr.ee/digiformationltd](https://linktr.ee/digiformationltd)
- 🏛️ **Companies House (GOV.UK):** [Company #16994903 Verification](https://find-and-update.company-information.service.gov.uk/company/16994903)
- 👥 **LinkedIn:** [Muhammad Haroon (Founder)](https://www.linkedin.com/in/muhammad-haroon-9a9945366)
- 📘 **Facebook:** [Digiformation Ltd](https://www.facebook.com/share/1D676UBQw5/)
- 📸 **Instagram:** [@digiformationltd](https://www.instagram.com/digiformationltd)
- 🎥 **YouTube:** [@digiformationltd](https://www.youtube.com/@digiformationltd)
- 🐦 **X (Twitter):** [@Digiformation00](https://x.com/Digiformation00)
- 🧵 **Threads:** [@digiformationltd](https://www.threads.com/@digiformationltd)
- 📌 **Pinterest:** [digiformation](https://pin.it/27w3dT5lp)
- 📍 **Registered Corporate Office:** Office 1006, 85 Dunstall Hill, Wolverhampton, United Kingdom

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
