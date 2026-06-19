"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TierPill } from "@/components/tier-pill";
import { ScoreHistoryChart } from "@/components/score-history-chart";
import {
  agentNameFromUri,
  formatUsdc,
  formatFeeBps,
  shortAddress,
  shortHash,
  formatTimestamp,
  tierFromScore,
  TIER_STYLES,
} from "@/lib/format-helpers";
import type { AgentDetail } from "@/app/api/agent/[id]/route";

export default function AgentDetailPage() {
  const params = useParams();
  const id = params["id"] as string;

  const [data, setData] = useState<AgentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/${id}`, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json()) as { error: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setData((await res.json()) as AgentDetail);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchAgent();
    const interval = setInterval(() => void fetchAgent(), 4000);
    return () => clearInterval(interval);
  }, [fetchAgent]);

  if (loading) return <LoadingSkeleton />;
  if (error || !data)
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="text-red-400 text-sm">{error ?? "Agent not found"}</div>
        <Link href="/" className="mt-4 inline-block text-accent text-sm hover:underline">
          ← Back to directory
        </Link>
      </div>
    );

  const name = agentNameFromUri(data.uri, data.id);
  const tier = tierFromScore(data.score);
  const tierStyle = TIER_STYLES[tier];
  const isLocal = data.chainId === 31337;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-6">
      {/* Back link */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Agent Directory
      </Link>

      {/* Header */}
      <div className="rounded-card border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-text-primary">{name}</h1>
              <TierPill score={data.score} />
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-text-muted font-mono">
              <span>ID #{data.id}</span>
              <span>·</span>
              <span title={data.controller}>{shortAddress(data.controller)}</span>
              {data.registeredAt > 0 && (
                <>
                  <span>·</span>
                  <span>Registered {formatTimestamp(data.registeredAt)}</span>
                </>
              )}
            </div>
          </div>

          {/* Score gauge */}
          <div className="text-right">
            <div className={`text-5xl font-bold tabular-nums ${tierStyle.text}`}>
              {data.score}
            </div>
            <div className="text-xs text-text-muted mt-0.5">/ 1000</div>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-5 h-2 w-full rounded-full bg-surface-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              tier === "Prime" ? "bg-emerald-400" :
              tier === "Established" ? "bg-blue-400" :
              tier === "Emerging" ? "bg-amber-400" : "bg-red-400"
            }`}
            style={{ width: `${(data.score / 1000) * 100}%` }}
          />
        </div>
      </div>

      {/* Credit terms */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TermCard label="Credit Limit" value={formatUsdc(data.creditLimit)} accent />
        <TermCard label="Fee Rate" value={formatFeeBps(data.feeBps)} />
        <TermCard label="Available Credit" value={formatUsdc(data.availableCredit)} />
        <TermCard
          label="Loan Balance"
          value={BigInt(data.loan.principal) > 0n ? formatUsdc(data.loan.principal) : "None"}
          warn={data.loan.defaulted}
        />
      </div>

      {/* Stats */}
      <div className="rounded-card border border-border bg-surface p-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-4">
          Activity Stats
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Settlements" value={data.settlements.toLocaleString()} />
          <Stat label="Failures" value={data.failures.toLocaleString()} warn={data.failures > 0} />
          <Stat label="Disputes Lost" value={data.disputesLost.toLocaleString()} warn={data.disputesLost > 0} />
          <Stat label="Defaults" value={data.defaults.toLocaleString()} warn={data.defaults > 0} />
          <Stat label="Total Volume" value={formatUsdc(data.volume)} colSpan />
          {data.lastUpdate > 0 && (
            <Stat label="Last Updated" value={formatTimestamp(data.lastUpdate)} colSpan />
          )}
        </div>
      </div>

      {/* Score history chart */}
      <div className="rounded-card border border-border bg-surface p-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-4">
          Score History
        </h2>
        <ScoreHistoryChart events={data.scoreHistory} currentScore={data.score} />
      </div>

      {/* Receipts */}
      <div className="rounded-card border border-border bg-surface p-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-4">
          Anchored Receipts ({data.receipts.length})
        </h2>
        {data.receipts.length === 0 ? (
          <p className="text-sm text-text-muted">No receipts anchored yet.</p>
        ) : (
          <div className="space-y-3">
            {[...data.receipts].reverse().map((r, i) => (
              <div
                key={i}
                className="rounded-lg border border-border-subtle bg-surface-2 px-4 py-3 font-mono text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4">
                  <Row label="Settlement" value={shortHash(r.settlementId)} />
                  <Row label="Receipt hash" value={shortHash(r.receiptHash)} />
                  <Row label="Signer" value={shortAddress(r.signer)} />
                  <Row
                    label="Anchored"
                    value={r.anchoredAt > 0 ? formatTimestamp(r.anchoredAt) : `Block #${r.blockNumber}`}
                  />
                </div>
                {!isLocal && (
                  <a
                    href={`https://hashkey.blockscout.com/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-accent hover:underline text-xs"
                  >
                    View on explorer
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 8L8 2M8 2H4M8 2v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TermCard({
  label,
  value,
  accent = false,
  warn = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className={`text-base font-bold ${accent ? "text-accent" : warn ? "text-red-400" : "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  warn = false,
  colSpan = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
  colSpan?: boolean;
}) {
  return (
    <div className={colSpan ? "sm:col-span-2" : ""}>
      <div className="text-xs text-text-muted mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${warn ? "text-red-400" : "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-text-muted w-24 flex-shrink-0">{label}</span>
      <span className="text-text-secondary truncate">{value}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-6 animate-pulse">
      <div className="h-4 w-32 bg-surface-3 rounded" />
      <div className="rounded-card border border-border bg-surface p-6 h-40" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border bg-surface h-20" />
        ))}
      </div>
      <div className="rounded-card border border-border bg-surface h-64" />
    </div>
  );
}
