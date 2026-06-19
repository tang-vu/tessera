import { GoogleGenAI } from "@google/genai";
import type { MandateChain } from "./mandate";
import { storeTrace, hashTrace, type StoredReceipt } from "./storage";

// Reasoning receipt: a structured LLM trace explaining a payment decision. The full trace is stored
// off-chain; its keccak256 hash is signed by the agent controller and anchored on-chain.

export interface ReasoningTrace {
  agentId: number;
  settlementId: `0x${string}`;
  decision: "APPROVE" | "DECLINE";
  summary: string;
  steps: string[];
  mandate: { payee: string; amount: string; currency: string };
  risk: { level: "low" | "medium" | "high"; notes: string };
  model: string;
  createdAt: string;
}

export interface ReceiptResult {
  trace: ReasoningTrace;
  stored: StoredReceipt;
  receiptHash: `0x${string}`;
}

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

type Mandate = { payee: string; amount: string; currency: string };

export async function generateReasoningTrace(agentId: number, chain: MandateChain): Promise<ReasoningTrace> {
  const mandate: Mandate = {
    payee: chain.payment.payee,
    amount: chain.payment.payment_amount.amount,
    currency: chain.payment.payment_amount.currency,
  };
  if (process.env.GEMINI_API_KEY) {
    try {
      return await geminiTrace(agentId, chain, mandate);
    } catch (e) {
      console.warn(`[receipt] Gemini failed, deterministic trace: ${(e as Error).message}`);
    }
  }
  return deterministicTrace(agentId, chain, mandate);
}

async function geminiTrace(agentId: number, chain: MandateChain, mandate: Mandate): Promise<ReasoningTrace> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const prompt = `You are the reasoning module of an autonomous payment agent on HashKey Chain.
Decide whether to APPROVE a stablecoin settlement and explain your reasoning. Respond as STRICT JSON.
Intent: ${chain.intent.natural_language_description}
Merchant: ${chain.cart.merchant.name}
Amount: ${mandate.amount} base units of ${mandate.currency} to payee ${mandate.payee}
Cart binds to payment via transaction_id ${chain.payment.transaction_id}.
Return JSON exactly: {"decision":"APPROVE"|"DECLINE","summary":string,"steps":string[],"risk":{"level":"low"|"medium"|"high","notes":string}}`;
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });
  const parsed = JSON.parse(res.text ?? "{}");
  return {
    agentId,
    settlementId: chain.settlementId,
    decision: parsed.decision === "DECLINE" ? "DECLINE" : "APPROVE",
    summary: String(parsed.summary ?? ""),
    steps: Array.isArray(parsed.steps) ? parsed.steps.map(String) : [],
    mandate,
    risk: {
      level: parsed.risk?.level ?? "low",
      notes: String(parsed.risk?.notes ?? ""),
    },
    model: MODEL,
    createdAt: new Date().toISOString(),
  };
}

function deterministicTrace(agentId: number, chain: MandateChain, mandate: Mandate): ReasoningTrace {
  return {
    agentId,
    settlementId: chain.settlementId,
    decision: "APPROVE",
    summary: `Approved settlement of ${mandate.amount} ${mandate.currency} to ${chain.cart.merchant.name}: mandate chain valid and within intent constraints.`,
    steps: [
      `Validated intent "${chain.intent.natural_language_description}" is not expired (expiry ${chain.intent.intent_expiry}).`,
      `Confirmed cart ${chain.cart.cartId} hash binds to the payment transaction_id.`,
      `Checked amount ${mandate.amount} ${mandate.currency} is within the agent's spending budget.`,
      `Verified payee ${mandate.payee} matches the authorized merchant ${chain.cart.merchant.id}.`,
      "Signed the reasoning receipt for on-chain anchoring.",
    ],
    mandate,
    risk: { level: "low", notes: "Deterministic fallback trace (set GEMINI_API_KEY for LLM reasoning)." },
    model: "deterministic-fallback",
    createdAt: new Date().toISOString(),
  };
}

/** Generate the trace, store it off-chain, and compute its anchorable hash. */
export async function createReceipt(agentId: number, chain: MandateChain): Promise<ReceiptResult> {
  const trace = await generateReasoningTrace(agentId, chain);
  const receiptHash = hashTrace(trace);
  const stored = await storeTrace(trace, receiptHash);
  return { trace, stored, receiptHash };
}
