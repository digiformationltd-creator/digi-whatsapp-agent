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

## 🚀 Installation & Quick Start Guide

### 🛠️ Method 1: Manual Installation (Step-by-Step)

#### Prerequisites
- [Node.js](https://nodejs.org/) v20.x or v22.x+ (Recommended: Node v22 LTS with built-in `node:sqlite`)
- A smartphone with WhatsApp installed for QR pairing

#### Step 1: Clone the Repository
```bash
git clone https://github.com/digiformationltd-creator/OPEN-WHATSAPP-AGENT-BY-DIGIFORMATION-LTD-.git
cd OPEN-WHATSAPP-AGENT-BY-DIGIFORMATION-LTD-
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
*(Optional)* Add your free API keys in `.env` (or add them later directly in the Web UI):
```env
PORT=9010
GROQ_API_KEY=gsk_your_groq_key_here
WHATSAPP_AGENT_KEY=your_opencode_zen_key_here
```

#### Step 4: Launch the Agent

**Option A (1-Click Windows Runner):**  
Double-click **`start.bat`** or **`start-whatsapp-agent.bat`**. It will automatically build and open the browser for you!

**Option B (Terminal Command):**  
```bash
# Development Mode (Hot Reloading)
npm run dev

# OR Production Mode (Compiled High Performance)
npm run build && npm start
```
Open **[http://localhost:9010](http://localhost:9010)** in your browser.

#### Step 5: Pair WhatsApp & Enter Keys
1. On the dashboard at `http://localhost:9010`, click **API Keys & Models** and paste your free Groq / AI key.
2. Click **Connect** on the dashboard and scan the pairing QR code with your phone (WhatsApp ➔ Linked Devices ➔ Link a Device).
3. The agent is now active and ready to sell 24/7!

---

### 🤖 Method 2: Automatic 1-Prompt Setup (For Antigravity & AI Assistants)

If you are using **Google Antigravity**, **Cursor**, **Windsurf**, or **Claude Code**, you don't even need to touch the terminal! 

Simply download & unzip the repository, open this folder in your AI editor, and **copy & paste this prompt** into the chat:

```text
Please setup and launch this WhatsApp AI Sales Agent project for me:
1. Check that Node.js is installed on my system.
2. Run 'npm install' to install all dependencies.
3. If .env does not exist, copy .env.example to .env.
4. Run 'npm run build' to compile the backend and frontend.
5. Start the server on port 9010 (node dist/backend/server.cjs) in the background.
6. Verify that http://localhost:9010/api/health is responding with {"ok": true}.
7. Open http://localhost:9010 in my default browser.
8. Guide me on how to enter my free Groq API key and customize my business knowledge base in the UI!
```

---

## 📁 Customizing for Your Business

You can customize your business catalog, pricing, and FAQs either directly inside the **Knowledge Base Studio** on the Web UI, or by editing the Markdown files in the `knowledge/` folder:

| Knowledge File | Purpose & Contents |
| :--- | :--- |
| **`knowledge/company-profile.md`** | Business name, official address, operating hours, and contact details |
| **`knowledge/packages-pricing.md`** | Products & services pricing table, tiers, inclusions, and timelines |
| **`knowledge/services.md`** | Overview of all business offerings, packages, and specialties |
| **`knowledge/faq.md`** | Common customer questions and verified factual answers |
| **`knowledge/documents-kyc.md`** | Order requirements, delivery specifications, and onboarding checklist |

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

<div align="center">
  <a href="https://www.digiformation.co.uk/" target="_blank">
    <img src="public/digiformation_logo.png" alt="Digiformation Ltd Logo" width="120" style="border-radius: 22px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); margin: 0 12px 12px 12px;" />
  </a>
  <a href="https://digibizos.co.uk/" target="_blank">
    <img src="public/digibizos_logo.png" alt="DIGI BIZ OS Logo" width="120" style="border-radius: 22px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); margin: 0 12px 12px 12px;" />
  </a>
  <p><strong>Developed & Maintained by Digiformation Ltd & DigiBiz OS Ecosystem</strong><br />
  <em>Official UK Company Registration # 16994903 • Incorporated in England & Wales</em></p>
</div>

- 🌐 **Official Website:** [www.digiformation.co.uk](https://www.digiformation.co.uk/)
- 🚀 **DigiBiz OS:** [digibizos.co.uk](https://digibizos.co.uk/)
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
