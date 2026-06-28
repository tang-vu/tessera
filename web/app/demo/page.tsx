"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { DemoResult } from "@/components/demo-result";
import { WalletSettlement } from "@/components/wallet-settlement";

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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {steps.map((s, i) => (
        <div
          key={i}
          className="group relative rounded-xl border border-hairline bg-white/[0.02] p-3.5 transition-colors hover:border-hairline-strong"
        >
          <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-iris/25 to-cyan/15 font-mono text-[10px] font-semibold text-iris ring-1 ring-iris/25">
            {s.icon}
          </div>
          <div className="mb-0.5 text-sm font-medium leading-snug text-text-primary">{s.label}</div>
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
  const { isConnected } = useAccount();
  // Hosted (Vercel) deploys are read-only; live settlement is enabled only when explicitly turned on.
  const liveDemo = process.env.NEXT_PUBLIC_LIVE_DEMO === "true";

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
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="fade-up">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3 py-1 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400 pulse-ring" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/85">
            Live Demo
          </span>
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-text-primary">
          One-Click <span className="text-gradient">Settlement Loop</span>
        </h1>
        <p className="mt-3 leading-relaxed text-text-secondary">
          Trigger a full settlement on HashKey Chain: the Beacon agent builds a mandate chain,
          generates a Gemini reasoning receipt, signs and anchors it on-chain, executes the
          USDC payment, and watches its credit score improve. Re-run to keep climbing.
        </p>
      </div>

      {/* Loop diagram */}
      <div className="card fade-up p-5 sm:p-6">
        <div className="mb-4 font-display text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
          The Settlement Loop
        </div>
        <LoopDiagram />
      </div>

      {liveDemo ? (
      <>
      {/* CTA */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={() => void handleSettle()}
          disabled={status === "running"}
          className={[
            "rounded-2xl px-8 py-4 text-base font-semibold transition-all duration-200",
            status === "running"
              ? "cursor-not-allowed border border-hairline bg-surface text-text-muted"
              : "btn-primary",
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
        <div className="card p-5 text-sm" style={{ ["--accent-line" as string]: "linear-gradient(90deg,#fb7185,transparent)" }}>
          <div className="mb-1 font-medium text-rose-300">Settlement failed</div>
          <div className="break-all font-mono text-xs text-text-muted">{error}</div>
          <div className="mt-3 text-xs text-text-muted">
            Make sure the RPC is reachable and <code className="font-mono text-text-secondary">DEPLOYER_PRIVATE_KEY</code> is set.
          </div>
        </div>
      )}

      {/* Result */}
      {status === "done" && result && (
        <>
          <Divider label={`Result #${runCount}`} />
          <DemoResult result={result} />
        </>
      )}

      {/* Wallet path */}
      <Divider label="Or" />

      {isConnected ? (
        <WalletSettlement />
      ) : (
        <div className="card p-5 text-center">
          <div className="mb-1 text-sm font-medium text-text-secondary">
            Run with your own wallet
          </div>
          <div className="text-xs text-text-muted">
            Connect a wallet via the nav bar to sign and submit each step yourself.
          </div>
        </div>
      )}
      </>
      ) : (
        <div className="card accent-line space-y-2 p-6 text-center">
          <div className="text-sm font-semibold text-text-primary">Hosted demo is read-only</div>
          <div className="text-xs leading-relaxed text-text-muted">
            Triggering a live settlement is disabled on this hosted dashboard. Watch the 90-second
            walkthrough in the{" "}
            <a
              href="https://github.com/tang-vu/tessera/blob/main/docs/tessera-demo.mp4"
              className="text-iris hover:underline"
            >
              README
            </a>
            , or run locally / on testnet to trigger a settlement yourself.
          </div>
        </div>
      )}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-hairline-strong" />
      <span className="text-xs uppercase tracking-[0.16em] text-text-muted">{label}</span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-hairline-strong" />
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
