"use client";

/**
 * WalletSettlement — browser-wallet-driven settlement flow for the /demo page.
 *
 * Flow:
 *   1. POST /api/demo/prepare  → { agentId, settlementId, receiptHash, ... }
 *   2. wallet signMessage({ raw: receiptHash })
 *   3. writeContract ReceiptVerifier.anchorReceipt(agentId, settlementId, receiptHash, sig)
 *   4. writeContract Stablecoin.approve(SettlementHook, amount)
 *   5. writeContract SettlementHook.settle(agentId, payee, amount, settlementId, true)
 *   6. Fetch /api/agent/[agentId] → show updated score + terms via DemoResult
 *
 * Rendered only when a wallet is connected. The existing one-click server path is unaffected.
 */
import { useState } from "react";
import { useAccount, useSignMessage, useWriteContract, usePublicClient } from "wagmi";
import { DemoResult } from "./demo-result";
import { shortAddress } from "@/lib/format-helpers";
import {
  RECEIPT_VERIFIER_ABI,
  MOCK_USDC_ABI,
  SETTLEMENT_HOOK_ABI,
  REPUTATION_ORACLE_ABI,
  CREDIT_POLICY_ABI,
} from "@/lib/generated/abis";

// ── Types ─────────────────────────────────────────────────────────────────────

type StepId =
  | "prepare"
  | "sign"
  | "anchor"
  | "approve"
  | "settle"
  | "score";

type StepStatus = "idle" | "running" | "done" | "error";

interface StepState {
  status: StepStatus;
  txHash?: string;
  error?: string;
}

type WalletStatus = "idle" | "running" | "done" | "error";

type DemoResultData = React.ComponentProps<typeof DemoResult>["result"];

// Matches what /api/demo/prepare returns
interface PrepareResponse {
  agentId: number;
  scoreBefore: number;
  settlementId: `0x${string}`;
  receiptHash: `0x${string}`;
  receiptUri: string;
  payee: `0x${string}`;
  amount: string;
  trace: DemoResultData["trace"];
  chainId: number;
}

// Minimal deployment shape we need client-side — fetched from /api/demo/deployment
interface ClientDeployment {
  AgentRegistry: `0x${string}`;
  ReceiptVerifier: `0x${string}`;
  ReputationOracle: `0x${string}`;
  CreditPolicy: `0x${string}`;
  SettlementHook: `0x${string}`;
  Stablecoin: `0x${string}`;
  stablecoinIsMock: boolean;
  chainId: number;
}

// ── Step label map ─────────────────────────────────────────────────────────────

const STEP_LABELS: Record<StepId, string> = {
  prepare: "Prepare (register + fund)",
  sign: "Sign receipt hash",
  anchor: "Anchor receipt on-chain",
  approve: "Approve USDC allowance",
  settle: "Execute settlement",
  score: "Fetch updated score",
};

const STEP_ORDER: StepId[] = ["prepare", "sign", "anchor", "approve", "settle", "score"];

// ── Component ─────────────────────────────────────────────────────────────────

export function WalletSettlement() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();

  const [status, setStatus] = useState<WalletStatus>("idle");
  const [steps, setSteps] = useState<Partial<Record<StepId, StepState>>>({});
  const [result, setResult] = useState<DemoResultData | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  function setStep(id: StepId, state: StepState) {
    setSteps((prev) => ({ ...prev, [id]: state }));
  }

  async function handleWalletSettle() {
    if (!address || !publicClient) return;
    setStatus("running");
    setSteps({});
    setResult(null);
    setGlobalError(null);

    try {
      // ── 1. Prepare (server registers + funds, builds receipt) ──────────────
      setStep("prepare", { status: "running" });
      const prepRes = await fetch("/api/demo/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const prep = (await prepRes.json()) as PrepareResponse & { error?: string };
      if (!prepRes.ok) throw new Error(prep.error ?? `prepare failed (${prepRes.status})`);
      setStep("prepare", { status: "done" });

      // ── Fetch deployment addresses from server ────────────────────────────
      const deplRes = await fetch("/api/demo/deployment");
      if (!deplRes.ok) throw new Error("Could not fetch deployment addresses");
      const deployment = (await deplRes.json()) as ClientDeployment;

      const agentIdBig = BigInt(prep.agentId);
      const amount = BigInt(prep.amount);

      // ── 2. Sign receipt hash (EIP-191 raw bytes) ──────────────────────────
      setStep("sign", { status: "running" });
      const signature = await signMessageAsync({
        message: { raw: prep.receiptHash },
      });
      setStep("sign", { status: "done" });

      // ── 3. anchorReceipt on ReceiptVerifier ───────────────────────────────
      setStep("anchor", { status: "running" });
      const anchorHash = await writeContractAsync({
        address: deployment.ReceiptVerifier,
        abi: RECEIPT_VERIFIER_ABI,
        functionName: "anchorReceipt",
        args: [agentIdBig, prep.settlementId, prep.receiptHash, signature],
      });
      await publicClient.waitForTransactionReceipt({ hash: anchorHash });
      setStep("anchor", { status: "done", txHash: anchorHash });

      // ── 4. approve Stablecoin for SettlementHook ──────────────────────────
      setStep("approve", { status: "running" });
      const approveHash = await writeContractAsync({
        address: deployment.Stablecoin,
        abi: MOCK_USDC_ABI,
        functionName: "approve",
        args: [deployment.SettlementHook, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      setStep("approve", { status: "done", txHash: approveHash });

      // ── 5. settle on SettlementHook ───────────────────────────────────────
      setStep("settle", { status: "running" });
      const settleHash = await writeContractAsync({
        address: deployment.SettlementHook,
        abi: SETTLEMENT_HOOK_ABI,
        functionName: "settle",
        args: [agentIdBig, prep.payee, amount, prep.settlementId, true],
      });
      await publicClient.waitForTransactionReceipt({ hash: settleHash });
      setStep("settle", { status: "done", txHash: settleHash });

      // ── 6. Read updated score + credit terms ──────────────────────────────
      setStep("score", { status: "running" });
      const scoreAfter = Number(
        await publicClient.readContract({
          address: deployment.ReputationOracle,
          abi: REPUTATION_ORACLE_ABI,
          functionName: "scoreOf",
          args: [agentIdBig],
        })
      );
      const [creditLimit, feeBps] = (await publicClient.readContract({
        address: deployment.CreditPolicy,
        abi: CREDIT_POLICY_ABI,
        functionName: "terms",
        args: [BigInt(scoreAfter)],
      })) as [bigint, number];
      setStep("score", { status: "done" });

      // Exact pre-settlement score comes from /api/demo/prepare (read server-side).
      setResult({
        agentId: prep.agentId,
        agentName: `Wallet ${shortAddress(address)}`,
        agentAddress: address,
        settlementId: prep.settlementId,
        receiptHash: prep.receiptHash,
        receiptUri: prep.receiptUri,
        storageBackend: "local",
        anchorTx: anchorHash,
        settleTx: settleHash,
        scoreBefore: prep.scoreBefore,
        scoreAfter,
        terms: { creditLimit: creditLimit.toString(), feeBps: Number(feeBps) },
        trace: prep.trace,
        chainId: prep.chainId,
      });

      setStatus("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Mark the currently-running step as errored
      setSteps((prev) => {
        const updated = { ...prev };
        for (const id of STEP_ORDER) {
          if (updated[id]?.status === "running") {
            updated[id] = { status: "error", error: msg };
          }
        }
        return updated;
      });
      setGlobalError(msg);
      setStatus("error");
    }
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5 space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
            Wallet Path
          </div>
          <div className="text-sm font-semibold text-text-primary">
            Run with my connected wallet
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {shortAddress(address!)}
        </span>
      </div>

      <p className="text-xs text-text-muted leading-relaxed">
        Each step is signed and submitted directly from your wallet. The server
        only prepares the receipt — it never holds your key.
      </p>

      {/* Run button */}
      <button
        onClick={() => void handleWalletSettle()}
        disabled={status === "running"}
        className={[
          "w-full px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          status === "running"
            ? "bg-surface-2 text-text-muted border border-border cursor-not-allowed"
            : "bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 hover:border-accent/50",
        ].join(" ")}
      >
        {status === "running" ? (
          <span className="flex items-center justify-center gap-2.5">
            <WalletSpinner />
            Running…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <WalletIcon />
            {status === "done" ? "Run Again" : "Run Settlement"}
          </span>
        )}
      </button>

      {/* Step tracker — visible once started */}
      {Object.keys(steps).length > 0 && (
        <div className="space-y-1.5">
          {STEP_ORDER.map((id) => {
            const s = steps[id];
            if (!s) return null;
            return (
              <StepRow
                key={id}
                label={STEP_LABELS[id]}
                state={s}
              />
            );
          })}
        </div>
      )}

      {/* Global error */}
      {status === "error" && globalError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-xs">
          <div className="text-red-400 font-medium mb-1">Step failed</div>
          <div className="font-mono text-text-muted break-all">{globalError}</div>
          {globalError.includes("User rejected") || globalError.includes("user rejected") ? (
            <div className="mt-2 text-text-muted">Request was rejected in wallet — click Run again to retry.</div>
          ) : (
            <div className="mt-2 text-text-muted">
              Ensure MetaMask is on the correct network (chain {process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337}) and has sufficient balance.
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {status === "done" && result && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Wallet Result</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <DemoResult result={result} />
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepRow({ label, state }: { label: string; state: StepState }) {
  const icon =
    state.status === "done"
      ? <CheckIcon />
      : state.status === "running"
      ? <WalletSpinner />
      : state.status === "error"
      ? <ErrorIcon />
      : null;

  const labelColor =
    state.status === "done"
      ? "text-emerald-400"
      : state.status === "running"
      ? "text-text-primary"
      : state.status === "error"
      ? "text-red-400"
      : "text-text-muted";

  return (
    <div className="flex items-center gap-2.5 text-xs">
      <span className="w-4 flex-shrink-0 flex items-center justify-center">{icon}</span>
      <span className={labelColor}>{label}</span>
      {state.txHash && (
        <span className="ml-auto font-mono text-text-muted truncate max-w-[120px]" title={state.txHash}>
          {state.txHash.slice(0, 10)}…
        </span>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-emerald-400">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-red-400">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5l4 4M9 5l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function WalletSpinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M7 2a5 5 0 015 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="4" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11.5" cy="10" r="1" fill="currentColor" />
      <path d="M4 1.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
