import path from "path";
import { getDeterministicReply } from "../src/backend/engine/deterministic";
import { HumanHandoff } from "../src/backend/handoff";
import { SalesPlaybook } from "../src/backend/sales/playbook";
import { MarkdownKnowledgeLoader } from "../src/backend/knowledge/markdown_loader";

console.log("================================================================================");
console.log("    GENERIC WHATSAPP AGENT — MULTI-INDUSTRY PLUG-AND-PLAY VERIFICATION        ");
console.log("================================================================================\n");

let passed = 0;
let total = 0;

function assert(condition: boolean, title: string, details: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] Test ${total}: ${title}`);
    console.log(`         • ${details}`);
  } else {
    console.error(`  [FAIL] Test ${total}: ${title}`);
    console.error(`         • ${details}`);
  }
}

// -----------------------------------------------------------------------------
// Industry 1: RESTAURANT & CAFE (The Olive Bistro)
// -----------------------------------------------------------------------------
console.log("\n🍽️  INDUSTRY 1: RESTAURANT & CAFE (The Olive Bistro)");
process.env.KNOWLEDGE_DIR = path.resolve(process.cwd(), "sample_knowledge/templates/restaurant");

const restProfile = MarkdownKnowledgeLoader.getBusinessProfile();
assert(restProfile.name === "The Olive Bistro & Grill", "Dynamic Profile Name", `Loaded: ${restProfile.name}`);

const restPizzaReply = getDeterministicReply("Truffle Pizza ka price kya hai?");
assert(!!restPizzaReply && restPizzaReply.includes("$22") && restPizzaReply.includes("Truffle Wood-Fired Pizza"), "Dynamic Menu Item Query", `Output: ${restPizzaReply?.slice(0, 60)}...`);

const restHandoff = HumanHandoff.getHandoffMessage();
assert(restHandoff.includes("+1 555 789 0123") && restHandoff.includes("reservations@olivebistro.com"), "Dynamic Restaurant Handoff", `Handoff: ${restHandoff.slice(0, 60)}...`);

// -----------------------------------------------------------------------------
// Industry 2: REAL ESTATE (Prime Horizon Real Estate)
// -----------------------------------------------------------------------------
console.log("\n🏢 INDUSTRY 2: REAL ESTATE AGENCY (Prime Horizon Real Estate)");
process.env.KNOWLEDGE_DIR = path.resolve(process.cwd(), "sample_knowledge/templates/real_estate");

const reProfile = MarkdownKnowledgeLoader.getBusinessProfile();
assert(reProfile.name === "Prime Horizon Real Estate", "Dynamic Real Estate Profile", `Loaded: ${reProfile.name}`);

const rePropReply = getDeterministicReply("Marina Apartment ka price aur details kya hain?");
assert(!!rePropReply && rePropReply.includes("$450,000") && rePropReply.includes("Luxury 2-Bed Marina Apartment"), "Dynamic Property Listing Query", `Output: ${rePropReply?.slice(0, 60)}...`);

const reObjection = SalesPlaybook.evaluateObjection("Are you legitimate real company?");
assert(reObjection.matched && !!reObjection.response_guidance && reObjection.response_guidance.includes("Prime Horizon Real Estate"), "Dynamic Real Estate Trust Objection", `Guidance: ${reObjection.response_guidance?.slice(0, 60)}...`);

// -----------------------------------------------------------------------------
// Industry 3: E-COMMERCE STORE (Urban Tech Gear)
// -----------------------------------------------------------------------------
console.log("\n🎧 INDUSTRY 3: E-COMMERCE STORE (Urban Tech Gear)");
process.env.KNOWLEDGE_DIR = path.resolve(process.cwd(), "sample_knowledge/templates/ecommerce");

const ecomProfile = MarkdownKnowledgeLoader.getBusinessProfile();
assert(ecomProfile.name === "Urban Tech Gear", "Dynamic E-Commerce Profile", `Loaded: ${ecomProfile.name}`);

const ecomHeadphones = getDeterministicReply("Horizon Pro Headphones ka price kya hai?");
assert(!!ecomHeadphones && ecomHeadphones.includes("$149") && ecomHeadphones.includes("Horizon Pro Wireless ANC Headphones"), "Dynamic E-Commerce Product Query", `Output: ${ecomHeadphones?.slice(0, 60)}...`);

const ecomFaq = getDeterministicReply("What is your return and refund policy?");
assert(!!ecomFaq && ecomFaq.includes("30-day hassle-free return policy"), "Dynamic E-Commerce FAQ Matching", `FAQ Output: ${ecomFaq?.slice(0, 60)}...`);

// -----------------------------------------------------------------------------
// Reset to Root Knowledge
// -----------------------------------------------------------------------------
delete process.env.KNOWLEDGE_DIR;

console.log("\n================================================================================");
console.log(`    FINAL RESULT: ${passed}/${total} TESTS PASSED (100% GENERIC DECOUPLING)`);
console.log("================================================================================\n");

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
