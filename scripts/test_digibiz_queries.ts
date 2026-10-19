import "dotenv/config";
import { AIOrchestrator } from "../src/backend/engine/ai_orchestrator";
import { resolveCustomerId } from "../src/backend/memory";

async function testQuery(q: string) {
  const jid = "923164467464@s.whatsapp.net";
  const custId = resolveCustomerId(jid);
  console.log(`\n======================================================`);
  console.log(`[USER QUERY]: "${q}"`);
  const reply = await AIOrchestrator.generateReply(q, jid, custId);
  console.log(`[AGENT REPLY]:\n${reply}`);
}

async function main() {
  await testQuery("Bhai Digi Biz OS ki price kya hai aur koi monthly subscription to nahi?");
  await testQuery("Voice assistant kya kaam karta hai?");
  await testQuery("Kya mera customer data safe rahay ga PC par?");
  await testQuery("Mujhe khareedna hai, buy karne ka kya tarika hai?");
}

main().catch(console.error);
