# 🚀 Digi WhatsApp Agent

> **An autonomous, production-ready AI Sales Agent & Conversational Engine for WhatsApp by DigiFormation Ltd.**  
> Powered by Baileys WhatsApp Web protocol, local SQLite memory, deterministic Finite State Machines, and 7-Tier Free AI Orchestration (Google Gemini #1, Groq LPU, Cloudflare Workers AI, Mistral AI, GitHub Models, SambaNova Cloud & Together AI).

<p align="center">
  <a href="https://github.com/digiformationltd-creator/digi-whatsapp-agent/releases/latest">
    <img src="https://img.shields.io/badge/⬇️_Download_Windows_Setup-v1.0.0_(.exe)-0284c7?style=for-the-badge&logo=windows&logoColor=white" alt="Download Windows Installer" />
  </a>
  <a href="https://www.digibizos.co.uk/open-source">
    <img src="https://img.shields.io/badge/🌐_DIGI_BIZ_OS-Open_Source_Hub-06b6d4?style=for-the-badge&logo=open-source-initiative&logoColor=white" alt="DIGI BIZ OS Open Source Hub" />
  </a>
  <a href="https://www.digiformation.co.uk/">
    <img src="https://img.shields.io/badge/Corporate_Entity-DigiFormation_Ltd-blue?style=for-the-badge" alt="DigiFormation Ltd" />
  </a>
  <img src="https://img.shields.io/badge/License-Source--Available-purple?style=for-the-badge" alt="License" />
</p>

> 🌟 **EXPLORE DIGI BIZ OS OPEN SOURCE ECOSYSTEM**  
> Discover our complete open-source suite of sovereign offline AI tools, automated WhatsApp sales agents, local CRM, customer invoicing, document engine, and multi-agent workflows.  
> 👉 **[✨ DIGI BIZ OS Open Source Hub & Tools Portal](https://www.digibizos.co.uk/open-source)**

---

## 🌟 Key Features

* **📱 Multi-Account WhatsApp Pairing:** Connect multiple WhatsApp accounts simultaneously using direct QR code pairing via `@whiskeysockets/baileys` without paying expensive Business API per-conversation fees.
* **🧠 7-Tier Free AI Cascading:** 100% Free Quotas cascading through Google Gemini 2.5 Flash (#1 Primary) ➔ Groq LPU (12ms) ➔ Cloudflare Workers AI ➔ Mistral AI ➔ GitHub Models ➔ SambaNova Cloud ➔ Together AI.
* **⚡ 0ms Deterministic Response Layer:** Instant Zero-AI fallback for standard inquiries (office hours, verification links, package lists). If external AI models go offline, the agent continues serving customers seamlessly.
* **🎙️ Voice Note Transcription (Whisper STT):** Inbound voice messages are automatically transcribed via Groq Whisper and answered in clean, authentic Pakistani Roman Urdu or English.
* **📊 8-Stage Sales Pipeline State Machine:** Deterministic Finite State Machine (`NEW` ➔ `GREETED` ➔ `QUALIFIED` ➔ `PACKAGE_SELECTED` ➔ `ORDER_INITIATED` ➔ `DOCUMENTS_PENDING` ➔ `COMPLETED`) ensuring structured sales conversations and Next-Best-Action (NBA) directives.
* **💾 Local SQLite Memory & Fact Extraction:** Automatically remembers customer names, locations, selected packages, and order references across sessions in a native zero-dependency SQLite database.
* **🛡️ Zero Hallucination & Discount Protection:** Strict pricing integrity rules enforce exact listed package prices and polite negotiation defense.
* **👨‍💼 Human Escalation & Follow-up Scheduler:** Automatically routes complex high-value deals to human managers and identifies stale leads for 24-hour follow-up messages.
* **💻 Modern Real-time Dashboard:** Built with React 19, TailwindCSS, Lucide icons, and live WebSocket event streams (`/ws/events`).

---

## 🚀 Installation & Quick Start Guide

### ⚡ Method 1: 1-Click Official Windows Installer (Recommended)
**No coding, no terminal, and no Node.js required!**

1. **Download the Official Installer:**  
   - 👉 **[⬇️ Direct GitHub Release Download: Digi WhatsApp Agent Setup 1.0.0.exe](https://github.com/digiformationltd-creator/digi-whatsapp-agent/releases/download/v1.0.0/Digi.WhatsApp.Agent.Setup.1.0.0.exe)**  
   - 📦 **[📁 Repository File Path: installer/Digi WhatsApp Agent Setup 1.0.0.exe](installer/Digi%20WhatsApp%20Agent%20Setup%201.0.0.exe)**  
   *(Or browse all versions on the [GitHub Releases Page](https://github.com/digiformationltd-creator/digi-whatsapp-agent/releases))*
2. **Run the Installer:** Double-click the downloaded setup file. It will install the application and place a shortcut on your Desktop and Start Menu.
3. **Launch the Agent:** Open **Digi WhatsApp Agent** from your desktop.
4. **Enter Free AI Keys & Connect WhatsApp:**
   - In the **Settings & API Keys** panel, paste your free Google Gemini, Groq, or Cloudflare key (direct "Get Key" buttons are provided on every card).
   - In the WhatsApp panel, click **Connect** and scan the QR code with your phone (WhatsApp ➔ Linked Devices ➔ Link a Device).
   - The agent is now live and working 24/7!

---

### 🛠️ Method 2: Developer Setup (Run from Source)

#### Prerequisites
- [Node.js](https://nodejs.org/) v20.x or v22.x+ (Recommended: Node v22 LTS with built-in `node:sqlite`)
- A smartphone with WhatsApp installed for QR pairing

#### Step 1: Clone the Repository
```bash
git clone https://github.com/digiformationltd-creator/digi-whatsapp-agent.git
cd digi-whatsapp-agent
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
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=gsk_your_groq_key_here
CLOUDFLARE_API_KEY=your_cloudflare_workers_ai_key_here
```

#### Step 4: Launch the Agent
```bash
# Development Mode (Hot Reloading)
npm run dev

# OR Production Mode (Compiled High Performance)
npm run build && npm start
```
Open **[http://localhost:9010](http://localhost:9010)** in your browser.

---

### 🤖 Method 3: Automatic 1-Prompt Setup (For Antigravity & AI Assistants)

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
    <img src="public/digiformation_logo.png" alt="Digiformation Ltd Logo" width="130" height="130" style="border-radius: 50%; box-shadow: 0 8px 24px rgba(0,0,0,0.3); margin-bottom: 12px; object-fit: contain;" />
  </a>
  <p><strong>Developed & Maintained by Digiformation Ltd</strong><br />
  <em>Official UK Company Registration # 16994903 • Incorporated in England & Wales</em><br />
  🏛️ <strong>Companies House (GOV.UK):</strong> <a href="https://find-and-update.company-information.service.gov.uk/company/16994903" target="_blank">Company #16994903 Verification</a><br />
  📍 <strong>Registered Corporate Office:</strong> Office 1006, 85 Dunstall Hill, Wolverhampton, United Kingdom</p>
</div>

- 🌐 **Official Website:** [www.digiformation.co.uk](https://www.digiformation.co.uk/)
- 🚀 **DigiBiz OS Open Source:** [digibizos.co.uk/open-source](https://www.digibizos.co.uk/open-source)
- ✉️ **Official Email:** [info@digiformation.co.uk](mailto:info@digiformation.co.uk)
- 📱 **WhatsApp & Direct Call:** [+92 316 446 7464](https://wa.me/923164467464)
- 🔗 **Linktree Hub:** [linktr.ee/digiformationltd](https://linktr.ee/digiformationltd)

- 👥 **LinkedIn:** [Muhammad Haroon (Founder)](https://www.linkedin.com/in/muhammad-haroon-9a9945366)
- 📘 **Facebook:** [Digiformation Ltd](https://www.facebook.com/share/1D676UBQw5/)
- 📸 **Instagram:** [@digiformationltd](https://www.instagram.com/digiformationltd)
- 🎥 **YouTube:** [@digiformationltd](https://www.youtube.com/@digiformationltd)
- 🐦 **X (Twitter):** [@Digiformation00](https://x.com/Digiformation00)
- 🧵 **Threads:** [@digiformationltd](https://www.threads.com/@digiformationltd)
- 📌 **Pinterest:** [digiformation](https://pin.it/27w3dT5lp)

---

## 📄 License & Fair-Use Terms

This project is licensed under the **Digiformation & DigiBiz OS Fair-Source License** (Strict Attribution & Non-Rebranding Edition).

* ✅ **Free Self-Hosting:** You are free to download, self-host, and use this software for your own business or personal use.
* ❌ **Strict No Rebranding:** You may NOT remove, alter, or obscure any logos, branding, or copyright attributions of **Digiformation Ltd** or **DigiBiz OS** in the UI, headers, footers, or code.
* ❌ **No White-Label Resale:** You may NOT resell, re-package, or distribute this software as your own commercial SaaS without written authorization.

Please refer to the full [LICENSE](LICENSE) file for complete legal terms.
