import { getDeterministicReply, matchSectionFromKb } from "./deterministic";
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
   * 1. Deterministic Layer (0ms, Zero-AI) with customKb support
   * 2. Scoped Context Assembly
   * 3. 4-Tier Cloud LLM Reasoning (Gemini -> Groq -> OpenAI -> OpenCode Zen)
   * 4. Resilient Knowledge Fallback (matchSectionFromKb)
   * 5. Sanitization & Delivery
   */
  static async generateReply(customerText: string, jid: string, customerId: string, customKb?: string): Promise<string> {
    const cleanText = (customerText || "").trim();
    if (!cleanText) return "";

    // 1. Check Zero-AI Deterministic Layer
    const deterministic = getDeterministicReply(cleanText, customKb);
    if (deterministic) {
      console.log(`[Orchestrator] Answered deterministically in 0ms (Zero AI)`);
      return deterministic;
    }

    // 2. Retrieve Scoped Knowledge Slice
    const scopedKB = retrieveRelevantKnowledge(cleanText);
    const effectiveKB = customKb || scopedKB;

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

    promptParts.push(`=== BUSINESS KNOWLEDGE BASE (Scoped Slice) ===\n${effectiveKB}`);

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

    let zenKey = (process.env.WHATSAPP_AGENT_KEY || "").trim();
    let groqKey = (process.env.GROQ_API_KEY || "").trim();
    let geminiKey = (process.env.GEMINI_WHATSAPP_KEY || process.env.GEMINI_API_KEY || "").trim();
    let openaiKey = (process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || "").trim();

    // ── Tier 1: Google Gemini (World-Class Multilingual Reasoning) ──────────
    if (geminiKey) {
      const geminiModels = [
        process.env.GEMINI_MODEL,
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-flash-latest",
        "gemini-3.8-flash",
      ].filter(Boolean) as string[];

      for (const model of geminiModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;
          const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: framedPrompt }] }],
              generationConfig: {
                maxOutputTokens: 350,
                temperature: 0.3,
              },
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (r.ok) {
            const d: any = await r.json();
            const text = String(d?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
            if (text && !text.toLowerCase().startsWith("error:")) {
              console.log(`[Orchestrator] Generated via Gemini (${model}) with scoped context`);
              return sanitizeWhatsAppReply(text);
            }
          }
        } catch (e: any) {
          console.error(`[Orchestrator] Gemini (${model}) error:`, e?.message);
        }
      }
    }

    // ── Tier 2: Groq High-Speed LPU (Quota-Safe max_tokens: 450) ───────────
    if (groqKey) {
      const groqModels = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "allam-2-7b"];
      for (const model of groqModels) {
        try {
          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: framedPrompt }],
              max_tokens: 450,
              temperature: 0.3,
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

    // ── Tier 3: Cloudflare Workers AI (Serverless Edge Inference) ──────────
    const cfAccountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
    const cfToken = (process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY || "").trim();
    if (cfAccountId && cfToken) {
      const preferredModel = (process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.3-70b-instruct").trim();
      const cfModels = [
        preferredModel,
        "@cf/meta/llama-3.3-70b-instruct",
        "@cf/meta/llama-3.1-8b-instruct",
        "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
        "@cf/qwen/qwen2.5-7b-instruct",
      ].filter((v, i, a) => a.indexOf(v) === i);

      for (const model of cfModels) {
        try {
          const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${model}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cfToken}`,
            },
            body: JSON.stringify({
              messages: [{ role: "user", content: framedPrompt }],
              max_tokens: 450,
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (r.ok) {
            const d: any = await r.json();
            const text = String(d?.result?.response || d?.result || "").trim();
            if (text && !text.toLowerCase().startsWith("error:")) {
              console.log(`[Orchestrator] Generated via Cloudflare Workers AI (${model})`);
              return sanitizeWhatsAppReply(text);
            }
          }
        } catch (e: any) {
          console.error(`[Orchestrator] Cloudflare (${model}) error:`, e?.message);
        }
      }
    }

    // ── Tier 4: Mistral AI (1 Billion Tokens/Month Free Experiment Tier) ─
    const mistralKey = (process.env.MISTRAL_API_KEY || "").trim();
    if (mistralKey) {
      const mistralModels = [
        process.env.MISTRAL_MODEL,
        "mistral-small-latest",
        "open-mistral-7b",
        "codestral-latest",
      ].filter(Boolean) as string[];

      for (const model of mistralModels) {
        try {
          const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${mistralKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: framedPrompt }],
              max_tokens: 450,
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (r.ok) {
            const d: any = await r.json();
            const text = String(d?.choices?.[0]?.message?.content || "").trim();
            if (text && !text.toLowerCase().startsWith("error:")) {
              console.log(`[Orchestrator] Generated via Mistral AI (${model})`);
              return sanitizeWhatsAppReply(text);
            }
          }
        } catch (e: any) {
          console.error(`[Orchestrator] Mistral AI (${model}) error:`, e?.message);
        }
      }
    }

    // ── Tier 5: GitHub Models (100% Free Tier via GitHub Token) ───────────
    const ghToken = (process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_TOKEN || "").trim();
    if (ghToken) {
      const ghModels = [
        process.env.GITHUB_MODEL,
        "gpt-4o-mini",
        "Meta-Llama-3.1-70B-Instruct",
        "Phi-3.5-mini-instruct",
      ].filter(Boolean) as string[];

      for (const model of ghModels) {
        try {
          const r = await fetch("https://models.inference.ai.azure.com/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${ghToken}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: framedPrompt }],
              max_tokens: 450,
              temperature: 0.3,
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (r.ok) {
            const d: any = await r.json();
            const text = String(d?.choices?.[0]?.message?.content || "").trim();
            if (text && !text.toLowerCase().startsWith("error:")) {
              console.log(`[Orchestrator] Generated via GitHub Models (${model})`);
              return sanitizeWhatsAppReply(text);
            }
          }
        } catch (e: any) {
          console.error(`[Orchestrator] GitHub Models (${model}) error:`, e?.message);
        }
      }
    }

    // ── Tier 6: SambaNova Cloud (100% Free Ultra-Fast Developer Tier ~400 T/s)
    const sambanovaKey = (process.env.SAMBANOVA_API_KEY || "").trim();
    if (sambanovaKey) {
      const snModels = [
        process.env.SAMBANOVA_MODEL,
        "Meta-Llama-3.1-70B-Instruct",
        "Meta-Llama-3.1-8B-Instruct",
        "Qwen2.5-72B-Instruct",
      ].filter(Boolean) as string[];

      for (const model of snModels) {
        try {
          const r = await fetch("https://api.sambanova.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sambanovaKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: framedPrompt }],
              max_tokens: 450,
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (r.ok) {
            const d: any = await r.json();
            const text = String(d?.choices?.[0]?.message?.content || "").trim();
            if (text && !text.toLowerCase().startsWith("error:")) {
              console.log(`[Orchestrator] Generated via SambaNova Cloud (${model})`);
              return sanitizeWhatsAppReply(text);
            }
          }
        } catch (e: any) {
          console.error(`[Orchestrator] SambaNova Cloud (${model}) error:`, e?.message);
        }
      }
    }

    // ── Tier 7: Together AI (Open-Source Free Models) ───────────────────────
    const togetherKey = (process.env.TOGETHER_API_KEY || "").trim();
    if (togetherKey) {
      const togetherModels = [
        process.env.TOGETHER_MODEL,
        "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        "mistralai/Mixtral-8x7B-Instruct-v0.1",
      ].filter(Boolean) as string[];

      for (const model of togetherModels) {
        try {
          const r = await fetch("https://api.together.xyz/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${togetherKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: framedPrompt }],
              max_tokens: 450,
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (r.ok) {
            const d: any = await r.json();
            const text = String(d?.choices?.[0]?.message?.content || "").trim();
            if (text && !text.toLowerCase().startsWith("error:")) {
              console.log(`[Orchestrator] Generated via Together AI (${model})`);
              return sanitizeWhatsAppReply(text);
            }
          }
        } catch (e: any) {
          console.error(`[Orchestrator] Together AI (${model}) error:`, e?.message);
        }
      }
    }

    // ── Resilient Fallback: Match Section From Knowledge Base Directly ────
    if (effectiveKB) {
      const matched = matchSectionFromKb(cleanText, effectiveKB);
      if (matched) {
        console.log(`[Orchestrator] Section matched from Knowledge Base directly`);
        return sanitizeWhatsAppReply(matched);
      }
    }

    return "";
  }
}
