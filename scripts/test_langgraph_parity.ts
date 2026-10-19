/**
 * Digi WhatsApp Agent — LangGraph Parity & Backend Verification Test Suite
 *
 * Verifies:
 * 1. LangGraph Native StateGraph Execution (supervisor, capabilities, finalize)
 * 2. SQLite Checkpointing & Thread Isolation (whatsapp:jid)
 * 3. WhatsApp CRM Contact Book, Deal Pipeline & Revenue Aggregation
 * 4. Per-Account Blocklist Guard (team/family exclusions)
 * 5. Multi-Mode Operation (Agent vs Commander)
 * 6. Deterministic Follow-Up Intelligence & Evidence Trails
 * 7. Server API Endpoints (/api/health, /api/whatsapp/crm, /api/whatsapp/blocklist, etc.)
 */

process.env.NODE_ENV = "test";

import http from "http";
import assert from "assert";
import { LangGraphEngine } from "../src/backend/engine/langgraph_agent";
import {
  waCrmRecordContact,
  waCrmListContacts,
  waCrmUpdateDealStatus,
  waCrmSummary,
  waCrmGetLeadSources,
} from "../src/backend/crm/wa_crm";
import {
  getWhatsappBlocklist,
  setWhatsappBlocklist,
  isBlocked,
  getWhatsappMode,
  setWhatsappMode,
} from "../src/backend/channels";
import {
  waMemoryRecord,
  waChatHistory,
  waChatRow,
  waChatMemoryTop,
} from "../src/backend/memory/wa_memory";
import {
  analyzeChat,
  scanFollowups,
  scanFollowupsDeep,
} from "../src/backend/scheduler/followup_engine";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.message || err);
      failed++;
    }
  })();
}

async function runAll() {
  console.log("\n=================================================================");
  console.log("   DIGI WHATSAPP AGENT — LANGGRAPH PARITY VERIFICATION SUITE   ");
  console.log("=================================================================\n");

  // 1. LangGraph StateGraph Execution & Grounding
  await test("1.1 LangGraph StateGraph: Deterministic Pricing Query Route", async () => {
    const threadId = "whatsapp:447111222333";
    const custId = "cust_test_01";
    const res = await LangGraphEngine.run("What is the price of UK company formation?", threadId, custId, {
      kbContent: "# UK LTD\nOur UK company formation package is £49 including registered address and VAT registration.",
    });

    assert.ok(res.ok, "Execution must be successful");
    assert.ok(res.response.length > 0, "Response must not be empty");
    assert.ok(res.state.route === "deterministic_reply" || res.state.capabilitiesCalled.includes("deterministic_reply"), "Should route to deterministic reply capability");
    assert.ok(res.response.includes("£49") || res.response.includes("49"), "Response must contain £49 from KB");
  });

  await test("1.2 LangGraph StateGraph: Greeting & Package Inquiry Route", async () => {
    const threadId = "whatsapp:447222333444";
    const custId = "cust_test_02";
    const res = await LangGraphEngine.run("Hello, what services do you provide?", threadId, custId, {
      kbContent: "# Services\n1. UK LTD Formation\n2. US LLC Formation\n3. Business Bank Account",
    });

    assert.ok(res.ok, "Execution must be successful");
    assert.ok(res.response.length > 0, "Response must not be empty");
    assert.ok(res.response.toLowerCase().includes("uk") || res.response.toLowerCase().includes("services"), "Response must mention services");
  });

  await test("1.3 LangGraph Checkpointer & Thread Isolation", async () => {
    const threadA = "whatsapp:447999888111";
    const threadB = "whatsapp:447999888222";

    await LangGraphEngine.run("Hi my name is Awais", threadA, "cust_a");
    await LangGraphEngine.run("Hi my name is John", threadB, "cust_b");

    const stateA = LangGraphEngine.getCheckpointedState(threadA);
    const stateB = LangGraphEngine.getCheckpointedState(threadB);

    assert.ok(stateA, "Thread A checkpoint must exist");
    assert.ok(stateB, "Thread B checkpoint must exist");
    assert.strictEqual(stateA.threadId, threadA, "Thread A must have its own threadId");
    assert.strictEqual(stateB.threadId, threadB, "Thread B must have its own threadId");
    assert.notStrictEqual(stateA.threadId, stateB.threadId, "Threads must be isolated");
  });

  // 2. WhatsApp CRM Contact Book & Deal Pipeline
  const testNum = "44788" + Math.floor(Math.random() * 900000 + 100000);
  await test("2.1 WhatsApp CRM: Contact Recording & Auto-Engagement", () => {
    waCrmRecordContact(testNum, "Fatima Khan");
    waCrmRecordContact(testNum);
    waCrmRecordContact(testNum); // 3rd interaction triggers 'engaged'

    const contacts = waCrmListContacts();
    const hit = contacts.find((c) => c.number === testNum);
    assert.ok(hit, "Contact must be recorded in CRM");
    assert.strictEqual(hit.name, "Fatima Khan", "Contact name must be recorded");
    assert.strictEqual(hit.deal_status, "engaged", "Deal status should advance to engaged on 3+ msgs");
  });

  await test("2.2 WhatsApp CRM: Deal Status & Revenue Update", () => {
    waCrmUpdateDealStatus(testNum, "won", 450);

    const contacts = waCrmListContacts();
    const hit = contacts.find((c) => c.number === testNum);
    assert.ok(hit, "Contact must exist");
    assert.strictEqual(hit.deal_status, "won", "Deal status must be won");
    assert.strictEqual(hit.deal_value, 450, "Deal value must be 450");

    const summary = waCrmSummary();
    assert.ok(summary.won >= 1, "Summary won count must be at least 1");
    assert.ok(summary.revenue >= 450, "Total revenue must include £450");
  });

  await test("2.3 WhatsApp CRM: Web Leads Parity", () => {
    const leads = waCrmGetLeadSources();
    assert.ok(Array.isArray(leads), "Leads must return array");
    assert.ok(leads.length > 0, "Leads should reflect contacts");
  });

  // 3. Blocklist Management & Guard
  await test("3.1 Blocklist: Set, Get & Detection Guard", () => {
    setWhatsappBlocklist(["+44 7123 456789", "0300-1234567"], "0");
    const list = getWhatsappBlocklist("0");
    assert.ok(list.includes("447123456789"), "List must contain cleaned international number");
    assert.ok(list.includes("03001234567"), "List must contain cleaned local number");

    assert.strictEqual(isBlocked("447123456789", "0"), true, "Should block exact digits");
    assert.strictEqual(isBlocked("03001234567", "0"), true, "Should block local digits");
    assert.strictEqual(isBlocked("923009999999", "0"), false, "Unlisted number must not be blocked");
  });

  // 4. WhatsApp Account Mode
  await test("4.1 Dual Mode: Agent vs Commander Flag", () => {
    setWhatsappMode("agent", "1");
    assert.strictEqual(getWhatsappMode("1"), "agent", "Mode should be agent");

    setWhatsappMode("commander", "1");
    assert.strictEqual(getWhatsappMode("1"), "commander", "Mode should switch to commander");

    setWhatsappMode("agent", "1");
  });

  // 5. Memory & Deterministic Follow-up Intelligence
  await test("5.1 WhatsApp Chat Memory: Record & Recency", () => {
    const jid = "447000111222@s.whatsapp.net";
    waMemoryRecord({
      jid,
      name: "Tariq Mahmood",
      text: "How much does a UK company cost?",
      fromMe: false,
      ts: Date.now() - 10000,
    });

    const row = waChatRow(jid);
    assert.ok(row, "Chat row must exist");
    assert.strictEqual(row.name, "Tariq Mahmood", "Chat row name must match");
    assert.strictEqual(row.last_from_me, 0, "Last message must be inbound");

    const history = waChatHistory(jid, 10);
    assert.ok(history.length >= 1, "Chat history must be retrievable");
  });

  await test("5.2 Follow-up Intelligence: Price Enquiry Detection", () => {
    const jid = "447000111222@s.whatsapp.net";
    const fol = analyzeChat(jid);
    assert.ok(fol, "Must identify follow-up for unanswered price question");
    assert.strictEqual(fol.priority, "MEDIUM", "Price inquiry priority must be MEDIUM");
    assert.ok(fol.owner_question.length > 0, "Owner question must be generated");
    assert.ok(fol.evidence.length > 0, "Evidence trail must be tagged");
  });

  await test("5.3 Follow-up Intelligence: Paid Claim High-Priority Detection", () => {
    const paidJid = "447333444555@s.whatsapp.net";
    waMemoryRecord({
      jid: paidJid,
      name: "Ahmed Ali",
      text: "I have transferred the payment for UK LTD. Please proceed.",
      fromMe: false,
      ts: Date.now() - 5000,
    });

    const fol = analyzeChat(paidJid);
    assert.ok(fol, "Must identify follow-up for claimed payment");
    assert.strictEqual(fol.priority, "HIGH", "Payment claim must be HIGH priority");
    assert.ok(fol.evidence.some((e) => e.text.includes("Customer CLAIMS")), "Must tag inference evidence");
  });

  await test("5.4 Deep Follow-up Scan Aggregation", async () => {
    const scan = await scanFollowupsDeep(60, 20);
    assert.ok(scan.scanned >= 1, "Must scan recent chats");
    assert.ok(Array.isArray(scan.followups), "Followups must be an array");
    assert.ok(scan.followups.length >= 1, "Should identify pending followups");
  });

  // 6. HTTP API Endpoint Verification
  await test("6.1 API Health & Status Endpoints", async () => {
    const { app } = await import("../src/backend/server");
    const server = http.createServer(app);
    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", () => resolve());
      server.on("error", reject);
    });

    try {
      const address = server.address() as any;
      const port = address.port;
      const baseUrl = `http://127.0.0.1:${port}`;

      // 1. /api/health
      const hRes = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(hRes.status, 200);
      const hData = await hRes.json();
      assert.strictEqual(hData.ok, true);

      // 2. /api/whatsapp/crm
      const crmRes = await fetch(`${baseUrl}/api/whatsapp/crm`);
      assert.strictEqual(crmRes.status, 200);
      const crmData = await crmRes.json();
      assert.strictEqual(crmData.ok, true);
      assert.ok(crmData.summary, "Must return summary");
      assert.ok(Array.isArray(crmData.contacts), "Must return contacts array");

      // 3. /api/whatsapp/blocklist
      const blRes = await fetch(`${baseUrl}/api/whatsapp/blocklist?id=0`);
      assert.strictEqual(blRes.status, 200);
      const blData = await blRes.json();
      assert.strictEqual(blData.ok, true);
      assert.ok(Array.isArray(blData.blocklist), "Must return blocklist array");

      // 4. /api/whatsapp/mode
      const modeRes = await fetch(`${baseUrl}/api/whatsapp/mode?id=0`);
      assert.strictEqual(modeRes.status, 200);
      const modeData = await modeRes.json();
      assert.strictEqual(modeData.ok, true);
      assert.ok(modeData.mode === "agent" || modeData.mode === "commander");

      // 5. /api/whatsapp/followups
      const folRes = await fetch(`${baseUrl}/api/whatsapp/followups`);
      assert.strictEqual(folRes.status, 200);
      const folData = await folRes.json();
      assert.strictEqual(folData.ok, true);
      assert.ok(Array.isArray(folData.followups), "Must return followups");

      // 6. /api/crm/web_whatsapp
      const webRes = await fetch(`${baseUrl}/api/crm/web_whatsapp`);
      assert.strictEqual(webRes.status, 200);
      const webData = await webRes.json();
      assert.strictEqual(webData.ok, true);
      assert.ok(Array.isArray(webData.leads), "Must return web leads");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  console.log("\n=================================================================");
  console.log(`   TEST EXECUTION COMPLETE: ${passed} PASSED, ${failed} FAILED   `);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
  setTimeout(() => process.exit(0), 200);
}

runAll().catch((err) => {
  console.error("Fatal Test Suite Failure:", err);
  process.exit(1);
});
