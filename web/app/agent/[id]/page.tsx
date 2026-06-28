"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TierPill } from "@/components/tier-pill";
import { ScoreRing } from "@/components/score-ring";
import { ScoreHistoryChart } from "@/components/score-history-chart";
import {
  agentNameFromUri,
  formatUsdc,
  formatFeeBps,
  shortAddress,
  shortHash,
  formatTimestamp,
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
        <div className="text-sm text-rose-300">{error ?? "Agent not found"}</div>
        <Link href="/" className="mt-4 inline-block text-sm text-iris hover:underline">
          ← Back to directory
        </Link>
      </div>
    );

  const name = agentNameFromUri(data.uri, data.id);
  const isLocal = data.chainId === 31337;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Agent Directory
      </Link>

      {/* Hero: identity + score gauge */}
      <div className="card accent-line fade-up p-6 sm:p-8">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <div className="mb-3 flex items-center justify-center gap-3 sm:justify-start">
              <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">{name}</h1>
              <TierPill score={data.score} />
            </div>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 font-mono text-xs text-text-muted sm:justify-start">
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
          <ScoreRing score={data.score} />
        </div>
      </div>

      {/* Credit terms */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      <Panel title="Activity Stats">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Settlements" value={data.settlements.toLocaleString()} />
          <Stat label="Failures" value={data.failures.toLocaleString()} warn={data.failures > 0} />
          <Stat label="Disputes Lost" value={data.disputesLost.toLocaleString()} warn={data.disputesLost > 0} />
          <Stat label="Defaults" value={data.defaults.toLocaleString()} warn={data.defaults > 0} />
          <Stat label="Total Volume" value={formatUsdc(data.volume)} colSpan />
          {data.lastUpdate > 0 && (
            <Stat label="Last Updated" value={formatTimestamp(data.lastUpdate)} colSpan />
          )}
        </div>
      </Panel>

      {/* Score history chart */}
      <Panel title="Score History">
        <ScoreHistoryChart events={data.scoreHistory} currentScore={data.score} />
      </Panel>

      {/* Receipts */}
      <Panel title={`Anchored Receipts (${data.receipts.length})`}>
        {data.receipts.length === 0 ? (
          <p className="text-sm text-text-muted">No receipts anchored yet.</p>
        ) : (
          <div className="space-y-3">
            {[...data.receipts].reverse().map((r, i) => (
              <div
                key={i}
                className="rounded-xl border border-hairline bg-white/[0.02] px-4 py-3 font-mono text-xs"
              >
                <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
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
                    className="mt-2 inline-flex items-center gap-1 text-xs text-iris hover:underline"
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
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card fade-up p-5 sm:p-6">
      <h2 className="mb-4 font-display text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
        {title}
      </h2>
      {children}
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
    <div className="card p-4">
      <div className="mb-1 text-[11px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className={`font-display text-base font-bold ${accent ? "text-gradient" : warn ? "text-rose-300" : "text-text-primary"}`}>
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
      <div className="mb-0.5 text-xs text-text-muted">{label}</div>
      <div className={`text-sm font-semibold ${warn ? "text-rose-300" : "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 flex-shrink-0 text-text-muted">{label}</span>
      <span className="truncate text-text-secondary">{value}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div className="shimmer h-4 w-32 rounded" />
      <div className="card h-44 p-6">
        <div className="shimmer h-full w-full rounded-xl opacity-40" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-20" />
        ))}
      </div>
      <div className="card h-64" />
    </div>
  );
}
