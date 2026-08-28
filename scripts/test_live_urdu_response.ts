import "dotenv/config";
import { AIOrchestrator } from "../src/backend/engine/ai_orchestrator";
import { resolveCustomerId } from "../src/backend/memory";

async function main() {
  const query1 = "مجھے آپ بس یہ بتائیں کہ آئل ٹی ڈی کے کون کون سے پیکجز ہیں آپ کے";
  const jid = "923164467464@s.whatsapp.net";
  const custId = resolveCustomerId(jid);

  console.log("=== Testing Urdu Script Inbound Query ===");
  console.log("Customer Query:", query1);
  const reply1 = await AIOrchestrator.generateReply(query1, jid, custId);
  console.log("\nAgent Reply:\n", reply1);

  console.log("\n=== Testing Roman Urdu Inbound Query ===");
  const query2 = "UK LTD k packages aur price batao";
  console.log("Customer Query:", query2);
  const reply2 = await AIOrchestrator.generateReply(query2, jid, custId);
  console.log("\nAgent Reply:\n", reply2);
}

main().catch(console.error);
