import { getDeterministicReply } from "./deterministic";
import { retrieveRelevantKnowledge } from "../knowledge/retriever";
import { StateMachine } from "../state/state_machine";
import { NextBestActionEngine } from "../sales/next_best_action";
import { SalesPlaybook } from "../sales/playbook";
import { CustomDevDiscovery } from "../sales/custom_dev_flow";
import { getConversationMemory } from "../memory";
import { sanitizeWhatsAppReply } from "../sanitizer";
import { getAgentCoreSystemPrompt } from "../core/agent_rules";

export class AIOrchestrator {
  /**
   * Main intelligent pipeline:
   * 1. Deterministic Layer (0ms, Zero-AI)
   * 2. Scoped Context Assembly
   * 3. Cloud LLM Reasoning (Groq -> OpenCode Zen)
   * 4. Sanitization & Delivery
   */
  static async generateReply(customerText: string, jid: string, customerId: string): Promise<string> {
    const cleanText = (customerText || "").trim();
    if (!cleanText) return "";

    // 1. Check Zero-AI Deterministic Layer
    const deterministic = getDeterministicReply(cleanText);
    if (deterministic) {
      console.log(`[Orchestrator] Answered deterministically in 0ms (Zero AI)`);
      return deterministic;
    }

    // 2. Retrieve Scoped Knowledge Slice
    const scopedKB = retrieveRelevantKnowledge(cleanText);

    // 3. Compute State & Next Best Action
    const state = StateMachine.getCustomerState(customerId, jid);
    const nextAction = NextBestActionEngine.computeNextAction(state);

    // 4. Evaluate Objection Playbook
    const objection = SalesPlaybook.evaluateObjection(cleanText);

    // 5. Build Scoped Prompt
    const promptParts: string[] = [
      getAgentCoreSystemPrompt(),
      `STRICT PRICING & FACTUAL ACCURACY MANDATE:\n` +
      `• All product names, packages, prices, and services MUST be quoted EXACTLY from the BUSINESS KNOWLEDGE BASE below.\n` +
      `• NEVER invent, rename, or approximate package names or prices.\n` +
      `• Always recommend the designated 'Most Popular' package if the customer is undecided.`
    ];

    promptParts.push(`=== BUSINESS KNOWLEDGE BASE (Scoped Slice) ===\n${scopedKB}`);

    promptParts.push(`=== SALES STATE & DIRECTIVE ===\n• Current Stage: ${state.stage}\n• Next Best Action Directive: ${nextAction.prompt_directive}`);

    if (objection.matched && objection.response_guidance) {
      promptParts.push(`=== OBJECTION PLAYBOOK GUIDANCE ===\n${objection.response_guidance}`);
    }

    if (CustomDevDiscovery.isCustomDevQuery(cleanText)) {
      promptParts.push(CustomDevDiscovery.getDiscoveryPromptDirective());
    }

    const memoryContext = getConversationMemory(jid);
    if (memoryContext) {
      promptParts.push(memoryContext);
    }

    promptParts.push(`=== INCOMING CUSTOMER MESSAGE (reply to this) ===\n${cleanText}`);

    const framedPrompt = promptParts.join("\n\n");

    // 6. Invoke AI Cloud Engine (Groq -> OpenCode Zen)
    let zenKey = (process.env.WHATSAPP_AGENT_KEY || "").trim();
    let groqKey = (process.env.GROQ_API_KEY || "").trim();

    // Groq Primary Fast Layer (1.1s - 1.6s)
    if (groqKey) {
      const groqModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "allam-2-7b"];
      for (const model of groqModels) {
        try {
          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: framedPrompt }],
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (r.ok) {
            const d: any = await r.json();
            const text = String(d?.choices?.[0]?.message?.content || "").trim();
            if (text && !text.toLowerCase().startsWith("error:")) {
              console.log(`[Orchestrator] Generated via Groq (${model}) with scoped context`);
              return sanitizeWhatsAppReply(text);
            }
          }
        } catch (e: any) {
          console.error(`[Orchestrator] Groq (${model}) error:`, e?.message);
        }
      }
    }

    // OpenCode Zen Fallback Layer
    if (zenKey) {
      try {
        const r = await fetch("https://opencode.ai/zen/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${zenKey}` },
          body: JSON.stringify({
            model: "nemotron-3-ultra-free",
            messages: [{ role: "user", content: framedPrompt }],
          }),
          signal: AbortSignal.timeout(35000),
        });
        if (r.ok) {
          const d: any = await r.json();
          const text = String(d?.choices?.[0]?.message?.content || "").trim();
          if (text && !text.toLowerCase().startsWith("error:")) {
            console.log(`[Orchestrator] Generated via OpenCode Zen (nemotron-3-ultra-free)`);
            return sanitizeWhatsAppReply(text);
          }
        }
      } catch (e: any) {
        console.error("[Orchestrator] OpenCode Zen error:", e?.message);
      }
    }

    return "";
  }
}
