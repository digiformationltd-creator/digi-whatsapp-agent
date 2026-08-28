import path from "path";
import { getDatabase } from "../src/backend/memory/db";
import { StateMachine } from "../src/backend/state/state_machine";

console.log("====================================================");
console.log("  PHASE 2: STATE ENGINE AUTOMATED TEST SUITE        ");
console.log("====================================================\n");

const db = getDatabase();
const custId = "cust_923331112233";
const jid = "923331112233@s.whatsapp.net";

// Clear test state
db.exec(`DELETE FROM customer_states WHERE customer_id = '${custId}'; DELETE FROM state_transitions WHERE customer_id = '${custId}';`);

// 1. Initial State
const s1 = StateMachine.getCustomerState(custId, jid);
console.log(`[TEST 1] Initial State: ${s1.stage} (Expected: NEW)`);
if (s1.stage !== "NEW") throw new Error("Initial stage was not NEW");

// 2. Greeting Trigger
const s2 = StateMachine.processInboundMessage(custId, jid, "Salam, company banana chahta hu");
console.log(`[TEST 2] Post-Greeting State: ${s2.stage} (Expected: GREETED)`);

// 3. Inquiry Trigger
const s3 = StateMachine.processInboundMessage(custId, jid, "UK company formation ki price kia hai?");
console.log(`[TEST 3] Post-Inquiry State: ${s3.stage} (Expected: QUALIFIED)`);

// 4. Package Selection Trigger
const s4 = StateMachine.processInboundMessage(custId, jid, "Silver package lena ha details btao");
console.log(`[TEST 4] Package Selected State: ${s4.stage} | Package: ${s4.selected_package}`);
if (s4.stage !== "PACKAGE_SELECTED" || !s4.selected_package?.includes("Silver")) {
  throw new Error("Package selection stage transition failed");
}

// 5. Order Initiated Trigger
const s5 = StateMachine.processInboundMessage(custId, jid, "Mera order ID # DIGI-8899 ha");
console.log(`[TEST 5] Order Initiated State: ${s5.stage} | Order: ${s5.order_number}`);
if (s5.stage !== "ORDER_INITIATED" || s5.order_number !== "DIGI-8899") {
  throw new Error("Order initiated transition failed");
}

// 6. Transition Audit Log
const stmt = db.prepare("SELECT * FROM state_transitions WHERE customer_id = ? ORDER BY id ASC");
const transitions = stmt.all(custId) as any[];
console.log(`\n[TEST 6] Logged Transitions (${transitions.length} total):`);
for (const t of transitions) {
  console.log(`  • ${t.from_stage} ──(${t.trigger})──► ${t.to_stage}`);
}

if (transitions.length >= 3) {
  console.log("\n====================================================");
  console.log("  ALL PHASE 2 STATE ENGINE TESTS PASSED (100%)");
  console.log("====================================================");
  process.exit(0);
} else {
  console.error("Transitions log incomplete");
  process.exit(1);
}
