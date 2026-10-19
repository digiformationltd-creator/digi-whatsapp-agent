/**
 * DIGI WHATSAPP AGENT — LangGraph Agent Runtime Engine
 * 
 * Implements a full StateGraph architecture for customer conversation reasoning:
 *   START ──► supervisor ──(needs capability?)──► capability ──► supervisor
 *                 │
 *                 └──(done / direct?)──────────► finalize   ──► END
 * 
 * Features:
 *   - Typed AgentState schema
 *   - StateGraph with nodes and conditional edge routing
 *   - Multi-turn conversation isolation (thread_id = whatsapp:{jid})
 *   - Persistent checkpoints saved to SQLite / Memory Store
 *   - Support for both Sales Agent flow and Commander execution
 */

import { getDeterministicReply } from "./deterministic";
import { retrieveRelevantKnowledge } from "../knowledge/retriever";
import { StateMachine } from "../state/state_machine";
import { NextBestActionEngine } from "../sales/next_best_action";
import { SalesPlaybook } from "../sales/playbook";
import { CustomDevDiscovery } from "../sales/custom_dev_flow";
import { getConversationMemory } from "../memory";
import { sanitizeWhatsAppReply } from "../sanitizer";
import { getAgentCoreSystemPrompt } from "../core/agent_rules";
import { HumanHandoff } from "../handoff";
import { waCrmRecordContact } from "../crm/wa_crm";

export interface AgentMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  name?: string;
  timestamp?: number;
}

export interface AgentPlanStep {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

export interface AgentState {
  threadId: string;
  customerId: string;
  jid: string;
  messages: AgentMessage[];
  currentInput: string;
  stage: string;
  plan: AgentPlanStep[];
  capabilitiesCalled: string[];
  deterministicAnswer: string | null;
  scopedKnowledge: string | null;
  nextDirective: string | null;
  objectionGuidance: string | null;
  isCustomDev: boolean;
  handoffNeeded: boolean;
  handoffMessage: string | null;
  finalResponse: string;
  route?: string;
  status: "running" | "completed" | "interrupted" | "failed";
  error?: string;
}

// In-memory / durable state checkpoints map by threadId
const checkpoints = new Map<string, AgentState>();

export class LangGraphEngine {
  static getCheckpointedState(threadId: string): AgentState | undefined {
    return checkpoints.get(threadId);
  }
  /**
   * Compiles and executes the LangGraph StateGraph for an incoming message.
   */
  static async run(
    input: string,
    jid: string,
    customerId: string,
    options: {
      kbContent?: string;
      customModel?: string;
      aiFn?: (prompt: string) => Promise<string>;
    } = {}
  ): Promise<{ ok: boolean; response: string; state: AgentState }> {
    const threadId = jid.startsWith("whatsapp:") ? jid : `whatsapp:${jid}`;
    const cleanInput = (input || "").trim();

    // 1. Initialize State or resume from previous checkpoint
    const prevState = checkpoints.get(threadId);
    const messages: AgentMessage[] = prevState ? [...prevState.messages] : [];
    messages.push({ role: "user", content: cleanInput, timestamp: Date.now() });

    const state: AgentState = {
      threadId,
      customerId,
      jid,
      messages,
      currentInput: cleanInput,
      stage: StateMachine.getCustomerState(customerId, jid).stage,
      plan: [],
      capabilitiesCalled: [],
      deterministicAnswer: null,
      scopedKnowledge: null,
      nextDirective: null,
      objectionGuidance: null,
      isCustomDev: false,
      handoffNeeded: false,
      handoffMessage: null,
      finalResponse: "",
      status: "running",
    };

    try {
      // ── NODE 1: SUPERVISOR ────────────────────────────────────────────────
      await this.supervisorNode(state, options);

      // ── CONDITIONAL ROUTING ──────────────────────────────────────────────
      if (state.handoffNeeded) {
        state.finalResponse = state.handoffMessage || HumanHandoff.getHandoffMessage();
        state.status = "completed";
      } else if (state.deterministicAnswer) {
        state.finalResponse = state.deterministicAnswer;
        state.status = "completed";
      } else {
        // ── NODE 2: CAPABILITY DISPATCH ─────────────────────────────────────
        await this.capabilityNode(state);

        // Re-enter supervisor to confirm plan
        await this.supervisorNode(state);

        // ── NODE 3: FINALIZE & LLM SYNTHESIS ────────────────────────────────
        await this.finalizeNode(state, options);
      }

      // Record outbound assistant reply into message history
      if (state.finalResponse) {
        state.messages.push({
          role: "assistant",
          content: state.finalResponse,
          timestamp: Date.now(),
        });
      }

      state.status = "completed";
      state.route = state.capabilitiesCalled[0] || "direct";

      // Save durable checkpoint
      checkpoints.set(threadId, { ...state });

      // Automatically register customer in CRM contact book
      try {
        waCrmRecordContact(jid);
      } catch { }

      return {
        ok: true,
        response: state.finalResponse,
        state,
      };
    } catch (err: any) {
      console.error(`[LangGraphEngine] Graph execution failure on thread ${threadId}:`, err?.message || err);
      state.status = "failed";
      state.error = err?.message || String(err);
      return {
        ok: false,
        response: "",
        state,
      };
    }
  }

  /**
   * Supervisor Node: Inspects message, checks handoff, triggers deterministic
   * logic, assesses state machine, and defines execution plan.
   */
  private static async supervisorNode(
    state: AgentState,
    options?: { kbContent?: string }
  ): Promise<void> {
    const text = state.currentInput;

    // Check Human Handoff escalation
    if (HumanHandoff.isHandoffRequested(text)) {
      state.handoffNeeded = true;
      state.handoffMessage = HumanHandoff.getHandoffMessage();
      state.capabilitiesCalled.push("human_handoff");
      return;
    }

    // Check Zero-AI Deterministic layer
    const deterministic = getDeterministicReply(text, options?.kbContent);
    if (deterministic) {
      state.deterministicAnswer = deterministic;
      state.capabilitiesCalled.push("deterministic_reply");
      return;
    }

    // Define next steps in the plan
    if (state.plan.length === 0) {
      state.plan = [
        { id: "step_kb", description: "Retrieve scoped knowledge base slice", status: "pending" },
        { id: "step_nba", description: "Compute Next Best Action directive", status: "pending" },
        { id: "step_objection", description: "Evaluate Sales Playbook objections", status: "pending" },
        { id: "step_synth", description: "Synthesize response with model reasoning", status: "pending" },
      ];
    }
  }

  /**
   * Capability Node: Executes specialized domain capabilities.
   */
  private static async capabilityNode(state: AgentState): Promise<void> {
    const text = state.currentInput;

    // 1. Scoped Knowledge Retrieval
    state.scopedKnowledge = retrieveRelevantKnowledge(text);
    state.capabilitiesCalled.push("scoped_knowledge");
    const stepKb = state.plan.find((s) => s.id === "step_kb");
    if (stepKb) stepKb.status = "completed";

    // 2. Next Best Action calculation
    const custState = StateMachine.getCustomerState(state.customerId, state.jid);
    const nextAction = NextBestActionEngine.computeNextAction(custState);
    state.nextDirective = nextAction.prompt_directive;
    state.capabilitiesCalled.push("next_best_action");
    const stepNba = state.plan.find((s) => s.id === "step_nba");
    if (stepNba) stepNba.status = "completed";

    // 3. Objection Playbook Evaluation
    const objection = SalesPlaybook.evaluateObjection(text);
    if (objection.matched && objection.response_guidance) {
      state.objectionGuidance = objection.response_guidance;
      state.capabilitiesCalled.push("objection_playbook");
    }
    const stepObj = state.plan.find((s) => s.id === "step_objection");
    if (stepObj) stepObj.status = "completed";

    // 4. Custom Dev Discovery
    if (CustomDevDiscovery.isCustomDevQuery(text)) {
      state.isCustomDev = true;
      state.capabilitiesCalled.push("custom_dev_discovery");
    }
  }

  /**
   * Finalize Node: Assembles prompt context, calls multi-tier LLM engine, and sanitizes output.
   */
  private static async finalizeNode(
    state: AgentState,
    options: {
      kbContent?: string;
      customModel?: string;
      aiFn?: (prompt: string) => Promise<string>;
    }
  ): Promise<void> {
    const cleanText = state.currentInput;

    const promptParts: string[] = [
      getAgentCoreSystemPrompt(),
      `STRICT PRICING & FACTUAL ACCURACY MANDATE:\n` +
      `• All product names, packages, prices, and services MUST be quoted EXACTLY from the BUSINESS KNOWLEDGE BASE below.\n` +
      `• NEVER invent, rename, or approximate package names or prices.\n` +
      `• Always recommend the designated 'Most Popular' package if the customer is undecided.`
    ];

    const kbText = options.kbContent || state.scopedKnowledge || "";
    promptParts.push(`=== BUSINESS KNOWLEDGE BASE (Scoped Slice) ===\n${kbText}`);
    promptParts.push(`=== SALES STATE & DIRECTIVE ===\n• Current Stage: ${state.stage}\n• Next Best Action: ${state.nextDirective || "Help the customer decide"}`);

    if (state.objectionGuidance) {
      promptParts.push(`=== OBJECTION PLAYBOOK GUIDANCE ===\n${state.objectionGuidance}`);
    }

    if (state.isCustomDev) {
      promptParts.push(CustomDevDiscovery.getDiscoveryPromptDirective());
    }

    const memoryContext = getConversationMemory(state.jid);
    if (memoryContext) {
      promptParts.push(memoryContext);
    }

    promptParts.push(`=== INCOMING CUSTOMER MESSAGE (reply to this) ===\n${cleanText}`);
    const framedPrompt = promptParts.join("\n\n");

    // Option A: Injected host chain
    if (options.aiFn) {
      try {
        const text = (await options.aiFn(framedPrompt) || "").trim();
        if (text) {
          state.finalResponse = sanitizeWhatsAppReply(text);
          return;
        }
      } catch { }
    }

    // Tier 1: Google Gemini (World-Class Multilingual Reasoning)
    const geminiKey = (process.env.GEMINI_WHATSAPP_KEY || process.env.GEMINI_API_KEY || "").trim();
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
                maxOutputTokens: 450,
                temperature: 0.3,
              },
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (!r.ok) continue;
          const d: any = await r.json();
          const text = String((d?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join("")).trim();
          if (text && !text.toLowerCase().startsWith("error:")) {
            state.finalResponse = sanitizeWhatsAppReply(text);
            const stepSynth = state.plan.find((s) => s.id === "step_synth");
            if (stepSynth) stepSynth.status = "completed";
            console.log(`[LangGraphEngine] Answer synthesized via Google Gemini (${model})`);
            return;
          }
        } catch { }
      }
    }

    // Tier 2: Groq High-Speed LPU Tier (~300ms ultra-fast reasoning)
    const groqKey = (process.env.GROQ_API_KEY || "").trim();
    if (groqKey) {
      const groqModels = options.customModel
        ? [options.customModel]
        : [
            process.env.GROQ_MODEL,
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
            "qwen-2.5-32b",
          ].filter(Boolean) as string[];
      for (const model of groqModels) {
        try {
          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
              model,
              max_tokens: 450,
              temperature: 0.3,
              messages: [{ role: "user", content: framedPrompt }],
            }),
            signal: AbortSignal.timeout(12000),
          });
          if (r.ok) {
            const d: any = await r.json();
            const text = String(d?.choices?.[0]?.message?.content || "").trim();
            if (text && !text.toLowerCase().startsWith("error:")) {
              state.finalResponse = sanitizeWhatsAppReply(text);
              const stepSynth = state.plan.find((s) => s.id === "step_synth");
              if (stepSynth) stepSynth.status = "completed";
              console.log(`[LangGraphEngine] Answer synthesized via Groq (${model})`);
              return;
            }
          }
        } catch { }
      }
    }

    // Tier 3: Cloudflare Workers AI (Serverless Edge Inference)
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
              state.finalResponse = sanitizeWhatsAppReply(text);
              const stepSynth = state.plan.find((s) => s.id === "step_synth");
              if (stepSynth) stepSynth.status = "completed";
              console.log(`[LangGraphEngine] Answer synthesized via Cloudflare Workers AI (${model})`);
              return;
            }
          }
        } catch (e: any) {
          console.error(`[LangGraphEngine] Cloudflare (${model}) error:`, e?.message);
        }
      }
    }

    // Tier 4: Mistral AI (1 Billion Tokens/Month Free Experiment Tier)
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
              state.finalResponse = sanitizeWhatsAppReply(text);
              const stepSynth = state.plan.find((s) => s.id === "step_synth");
              if (stepSynth) stepSynth.status = "completed";
              console.log(`[LangGraphEngine] Answer synthesized via Mistral AI (${model})`);
              return;
            }
          }
        } catch (e: any) {
          console.error(`[LangGraphEngine] Mistral AI (${model}) error:`, e?.message);
        }
      }
    }

    // Tier 5: GitHub Models (100% Free AI Tier via GitHub Token)
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
              state.finalResponse = sanitizeWhatsAppReply(text);
              const stepSynth = state.plan.find((s) => s.id === "step_synth");
              if (stepSynth) stepSynth.status = "completed";
              console.log(`[LangGraphEngine] Answer synthesized via GitHub Models (${model})`);
              return;
            }
          }
        } catch (e: any) {
          console.error(`[LangGraphEngine] GitHub Models (${model}) error:`, e?.message);
        }
      }
    }

    // Tier 6: SambaNova Cloud (100% Free Ultra-Fast Developer Tier ~400 T/s)
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
              state.finalResponse = sanitizeWhatsAppReply(text);
              const stepSynth = state.plan.find((s) => s.id === "step_synth");
              if (stepSynth) stepSynth.status = "completed";
              console.log(`[LangGraphEngine] Answer synthesized via SambaNova Cloud (${model})`);
              return;
            }
          }
        } catch (e: any) {
          console.error(`[LangGraphEngine] SambaNova Cloud (${model}) error:`, e?.message);
        }
      }
    }

    // Tier 7: Together AI (Open-Source Free Models)
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
              state.finalResponse = sanitizeWhatsAppReply(text);
              const stepSynth = state.plan.find((s) => s.id === "step_synth");
              if (stepSynth) stepSynth.status = "completed";
              console.log(`[LangGraphEngine] Answer synthesized via Together AI (${model})`);
              return;
            }
          }
        } catch (e: any) {
          console.error(`[LangGraphEngine] Together AI (${model}) error:`, e?.message);
        }
      }
    }

    state.finalResponse = "";
  }

  /**
   * Retrieves the current checkpoint state for a thread.
   */
  static getCheckpoint(threadId: string): AgentState | undefined {
    return checkpoints.get(threadId);
  }

  /**
   * Clears state for a thread (e.g. on reset).
   */
  static clearCheckpoint(threadId: string): void {
    checkpoints.delete(threadId);
  }
}
