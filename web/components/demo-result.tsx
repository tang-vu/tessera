"use client";

import { useEffect, useState } from "react";
import { TierPill } from "./tier-pill";
import {
  formatUsdc,
  formatFeeBps,
  shortHash,
  tierFromScore,
} from "@/lib/format-helpers";

interface DemoResultProps {
  result: {
    agentId: number;
    agentName: string;
    agentAddress: string;
    settlementId: string;
    receiptHash: string;
    receiptUri: string;
    storageBackend: string;
    anchorTx: string;
    settleTx: string;
    scoreBefore: number;
    scoreAfter: number;
    terms: { creditLimit: string; feeBps: number };
    trace: {
      decision: "APPROVE" | "DECLINE";
      summary: string;
      steps: string[];
      mandate: { payee: string; amount: string; currency: string };
      risk: { level: string; notes: string };
      model: string;
      createdAt: string;
    };
    chainId: number;
  };
}

export function DemoResult({ result }: DemoResultProps) {
  const [showScore, setShowScore] = useState(false);
  const delta = result.scoreAfter - result.scoreBefore;
  const tierBefore = tierFromScore(result.scoreBefore);
  const tierAfter = tierFromScore(result.scoreAfter);
  const tierChanged = tierBefore !== tierAfter;

  useEffect(() => {
    const t = setTimeout(() => setShowScore(true), 100);
    return () => clearTimeout(t);
  }, []);

  const isLocal = result.chainId === 31337;

  return (
    <div className="space-y-5">
      {/* Score jump */}
      <div
        className="card accent-line p-6"
        style={{ ["--accent-line" as string]: "linear-gradient(90deg,#2dd4bf,#22d3ee)" }}
      >
        <div className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-teal-300/80">
          Credit Score Updated
        </div>
        <div className="flex flex-wrap items-end gap-8">
          {/* Before */}
          <div className="text-center">
            <div className="mb-1 text-xs text-text-muted">Before</div>
            <div className="font-display text-4xl font-bold tabular-nums text-text-secondary">
              {result.scoreBefore}
            </div>
            <div className="mt-1.5">
              <TierPill score={result.scoreBefore} size="sm" />
            </div>
          </div>

          {/* Arrow + delta */}
          <div className="flex flex-col items-center gap-1 pb-4">
            <div className={`font-display text-lg font-bold tabular-nums ${delta >= 0 ? "text-teal-300" : "text-rose-300"}`}>
              {delta >= 0 ? "+" : ""}{delta}
            </div>
            <svg width="36" height="14" viewBox="0 0 36 14" fill="none" className="text-teal-300">
              <path d="M0 7h32M26 1l8 6-8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* After */}
          <div className="text-center">
            <div className="mb-1 text-xs text-text-muted">After</div>
            <div
              className={`font-display text-5xl font-bold tabular-nums text-teal-300 transition-all duration-700 ${showScore ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}
              style={{ textShadow: "0 0 28px rgba(45,212,191,0.5)" }}
            >
              {result.scoreAfter}
            </div>
            <div className="mt-1.5">
              <TierPill score={result.scoreAfter} />
            </div>
          </div>
        </div>

        {tierChanged && (
          <div className="mt-5 rounded-xl border border-teal-400/25 bg-teal-500/10 px-4 py-2.5 text-sm text-teal-200">
            Tier upgraded: <strong>{tierBefore}</strong> → <strong>{tierAfter}</strong>
          </div>
        )}
      </div>

      {/* Credit terms */}
      <div className="card p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
          New Credit Terms
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-hairline bg-white/[0.02] px-4 py-3">
            <div className="mb-1 text-xs text-text-muted">Credit Limit</div>
            <div className="font-display text-lg font-bold text-gradient">
              {formatUsdc(result.terms.creditLimit)}
            </div>
          </div>
          <div className="rounded-xl border border-hairline bg-white/[0.02] px-4 py-3">
            <div className="mb-1 text-xs text-text-muted">Fee Rate</div>
            <div className="font-display text-lg font-bold text-text-primary">
              {formatFeeBps(result.terms.feeBps)}
            </div>
          </div>
        </div>
      </div>

      {/* Reasoning receipt */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
            Reasoning Receipt
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
              result.trace.decision === "APPROVE"
                ? "border-teal-400/25 bg-teal-500/10 text-teal-300"
                : "border-rose-400/25 bg-rose-500/10 text-rose-300"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${result.trace.decision === "APPROVE" ? "bg-teal-400" : "bg-rose-400"}`} />
            {result.trace.decision}
          </span>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-text-secondary">
          {result.trace.summary}
        </p>

        {result.trace.steps.length > 0 && (
          <div className="mb-4 space-y-2">
            {result.trace.steps.map((step, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] font-mono text-xs text-text-muted">
                  {i + 1}
                </span>
                <span className="leading-snug text-text-secondary">{step}</span>
              </div>
            ))}
          </div>
        )}

        {/* Risk */}
        <div className="mb-4 rounded-xl border border-hairline bg-white/[0.02] px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Risk:</span>
            <span
              className={`font-semibold capitalize ${
                result.trace.risk.level === "low"
                  ? "text-teal-300"
                  : result.trace.risk.level === "medium"
                  ? "text-amber-300"
                  : "text-rose-300"
              }`}
            >
              {result.trace.risk.level}
            </span>
            {result.trace.risk.notes && (
              <>
                <span className="text-text-muted">·</span>
                <span className="text-text-muted">{result.trace.risk.notes}</span>
              </>
            )}
          </div>
        </div>

        {/* Hashes + txs */}
        <div className="space-y-2 font-mono text-xs">
          <HashRow label="Receipt hash" value={result.receiptHash} />
          <HashRow label="Settlement ID" value={result.settlementId} />
          <HashRow
            label="Anchor tx"
            value={result.anchorTx}
            href={isLocal ? undefined : `https://hashkey.blockscout.com/tx/${result.anchorTx}`}
          />
          <HashRow
            label="Settle tx"
            value={result.settleTx}
            href={isLocal ? undefined : `https://hashkey.blockscout.com/tx/${result.settleTx}`}
          />
          {result.receiptUri && result.receiptUri !== "local" && (
            <HashRow label="Receipt URI" value={result.receiptUri} href={result.receiptUri} />
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
          <span>Model: <span className="font-mono text-text-secondary">{result.trace.model}</span></span>
          <span>·</span>
          <span>Backend: <span className="text-text-secondary">{result.storageBackend}</span></span>
        </div>
      </div>
    </div>
  );
}

function HashRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 flex-shrink-0 text-text-muted">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-iris hover:underline"
          title={value}
        >
          {shortHash(value)}
        </a>
      ) : (
        <span className="truncate text-text-secondary" title={value}>
          {shortHash(value)}
        </span>
      )}
    </div>
  );
}
