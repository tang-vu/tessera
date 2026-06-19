"use client";

import { useState } from "react";
import { DemoResult } from "@/components/demo-result";

type DemoResultData = React.ComponentProps<typeof DemoResult>["result"];

type Status = "idle" | "running" | "done" | "error";

function LoopDiagram() {
  const steps = [
    { icon: "01", label: "Build AP2 mandate chain", sub: "Intent → Cart → Payment" },
    { icon: "02", label: "LLM generates reasoning receipt", sub: "Gemini traces the decision" },
    { icon: "03", label: "Agent signs & anchors receipt", sub: "EIP-191 signature on-chain" },
    { icon: "04", label: "SettlementHook executes payment", sub: "USDC transfer + reputation record" },
    { icon: "05", label: "ReputationOracle updates score", sub: "ScoreUpdated event emitted" },
    { icon: "06", label: "CreditPolicy recalculates terms", sub: "Higher score = better terms" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {steps.map((s, i) => (
        <div key={i} className="rounded-lg border border-border-subtle bg-surface-2 p-3">
          <div className="text-[10px] font-mono text-text-muted mb-1.5">{s.icon}</div>
          <div className="text-sm font-medium text-text-primary leading-snug mb-0.5">{s.label}</div>
          <div className="text-xs text-text-muted">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

export default function DemoPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<DemoResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runCount, setRunCount] = useState(0);

  async function handleSettle() {
    setStatus("running");
    setError(null);
    try {
      const res = await fetch("/api/demo/settle", { method: "POST" });
      const json = await res.json() as DemoResultData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResult(json);
      setRunCount((c) => c + 1);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium uppercase tracking-widest text-emerald-400">
            Live Demo
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary mb-3">
          One-Click Settlement Loop
        </h1>
        <p className="text-text-secondary leading-relaxed">
          Trigger a full settlement on Anvil: the Beacon agent builds a mandate chain,
          generates a Gemini reasoning receipt, signs and anchors it on-chain, executes the
          USDC payment, and watches its credit score improve. Re-run to keep climbing.
        </p>
      </div>

      {/* Loop diagram */}
      <div className="rounded-card border border-border bg-surface p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-text-muted mb-4">
          The Settlement Loop
        </div>
        <LoopDiagram />
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={() => void handleSettle()}
          disabled={status === "running"}
          className={[
            "relative px-8 py-4 rounded-xl text-base font-semibold transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            status === "running"
              ? "bg-surface-2 text-text-muted border border-border cursor-not-allowed"
              : "bg-accent hover:bg-accent-dim text-white shadow-glow hover:shadow-lg active:scale-[0.98]",
          ].join(" ")}
        >
          {status === "running" ? (
            <span className="flex items-center gap-2.5">
              <Spinner />
              Running settlement…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2v14M2 9h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {runCount === 0 ? "Run a Settlement" : "Run Another Settlement"}
            </span>
          )}
        </button>

        {runCount > 0 && status !== "running" && (
          <p className="text-xs text-text-muted">
            {runCount} settlement{runCount !== 1 ? "s" : ""} run this session
          </p>
        )}
      </div>

      {/* Error state */}
      {status === "error" && error && (
        <div className="rounded-card border border-red-500/20 bg-red-500/5 p-5 text-sm">
          <div className="text-red-400 font-medium mb-1">Settlement failed</div>
          <div className="text-text-muted font-mono text-xs break-all">{error}</div>
          <div className="mt-3 text-xs text-text-muted">
            Make sure anvil is running and <code className="font-mono text-text-secondary">DEPLOYER_PRIVATE_KEY</code> is set.
          </div>
        </div>
      )}

      {/* Result */}
      {status === "done" && result && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Result #{runCount}</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <DemoResult result={result} />
        </>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
