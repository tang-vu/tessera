"use client";

import { useEffect, useState } from "react";
import { TierPill } from "./tier-pill";
import {
  formatUsdc,
  formatFeeBps,
  shortHash,
  shortAddress,
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
    <div className="space-y-5 animate-slide-up">
      {/* Score jump */}
      <div className="rounded-card border border-emerald-500/20 bg-emerald-500/5 p-6">
        <div className="text-xs font-medium uppercase tracking-wider text-emerald-400/70 mb-4">
          Credit Score Updated
        </div>
        <div className="flex items-end gap-6 flex-wrap">
          {/* Before */}
          <div className="text-center">
            <div className="text-xs text-text-muted mb-1">Before</div>
            <div className="text-4xl font-bold tabular-nums text-text-secondary">
              {result.scoreBefore}
            </div>
            <div className="mt-1">
              <TierPill score={result.scoreBefore} size="sm" />
            </div>
          </div>

          {/* Arrow + delta */}
          <div className="flex flex-col items-center gap-1 pb-4">
            <div
              className={`text-lg font-bold tabular-nums ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {delta >= 0 ? "+" : ""}{delta}
            </div>
            <svg width="32" height="14" viewBox="0 0 32 14" fill="none" className="text-emerald-400">
              <path d="M0 7h28M22 1l8 6-8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* After */}
          <div className="text-center">
            <div className="text-xs text-text-muted mb-1">After</div>
            <div
              className={`text-5xl font-bold tabular-nums text-emerald-400 transition-all duration-700 ${showScore ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
            >
              {result.scoreAfter}
            </div>
            <div className="mt-1">
              <TierPill score={result.scoreAfter} />
            </div>
          </div>
        </div>

        {/* Tier upgrade banner */}
        {tierChanged && (
          <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm text-emerald-300">
            Tier upgraded: <strong>{tierBefore}</strong> → <strong>{tierAfter}</strong>
          </div>
        )}
      </div>

      {/* Credit terms */}
      <div className="rounded-card border border-border bg-surface p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
          New Credit Terms
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface-2 px-4 py-3">
            <div className="text-xs text-text-muted mb-1">Credit Limit</div>
            <div className="text-lg font-bold text-accent">
              {formatUsdc(result.terms.creditLimit)}
            </div>
          </div>
          <div className="rounded-lg bg-surface-2 px-4 py-3">
            <div className="text-xs text-text-muted mb-1">Fee Rate</div>
            <div className="text-lg font-bold text-text-primary">
              {formatFeeBps(result.terms.feeBps)}
            </div>
          </div>
        </div>
      </div>

      {/* Reasoning receipt */}
      <div className="rounded-card border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Reasoning Receipt
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
              result.trace.decision === "APPROVE"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${result.trace.decision === "APPROVE" ? "bg-emerald-400" : "bg-red-400"}`} />
            {result.trace.decision}
          </span>
        </div>

        {/* Summary */}
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {result.trace.summary}
        </p>

        {/* Steps */}
        {result.trace.steps.length > 0 && (
          <div className="space-y-2 mb-4">
            {result.trace.steps.map((step, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-surface-3 text-text-muted text-xs flex items-center justify-center font-mono">
                  {i + 1}
                </span>
                <span className="text-text-secondary leading-snug">{step}</span>
              </div>
            ))}
          </div>
        )}

        {/* Risk */}
        <div className="rounded-lg bg-surface-2 px-3 py-2.5 mb-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Risk:</span>
            <span
              className={`font-semibold capitalize ${
                result.trace.risk.level === "low"
                  ? "text-emerald-400"
                  : result.trace.risk.level === "medium"
                  ? "text-amber-400"
                  : "text-red-400"
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

        <div className="mt-3 text-xs text-text-muted flex items-center gap-2">
          <span>Model: <span className="text-text-secondary font-mono">{result.trace.model}</span></span>
          <span>·</span>
          <span>Backend: <span className="text-text-secondary">{result.storageBackend}</span></span>
        </div>
      </div>
    </div>
  );
}

function HashRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-text-muted w-24 flex-shrink-0">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline truncate"
          title={value}
        >
          {shortHash(value)}
        </a>
      ) : (
        <span className="text-text-secondary truncate" title={value}>
          {shortHash(value)}
        </span>
      )}
    </div>
  );
}
