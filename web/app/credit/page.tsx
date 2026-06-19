"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TierPill } from "@/components/tier-pill";
import { StatCard } from "@/components/stat-card";
import {
  formatUsdc,
  formatFeeBps,
  agentNameFromUri,
  shortAddress,
  formatTimestamp,
  tierFromScore,
  TIER_STYLES,
} from "@/lib/format-helpers";
import type { CreditPoolResponse, CreditTier, AgentLoan } from "@/app/api/credit/route";

export default function CreditPage() {
  const [data, setData] = useState<CreditPoolResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredit = useCallback(async () => {
    try {
      const res = await fetch("/api/credit", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as CreditPoolResponse);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCredit();
    const interval = setInterval(() => void fetchCredit(), 4000);
    return () => clearInterval(interval);
  }, [fetchCredit]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary mb-2">
          Credit Pool
        </h1>
        <p className="text-text-secondary">
          Under-collateralized lending pool powered by on-chain reputation scores.
          Agents with higher scores unlock larger credit limits and lower fees.
        </p>
      </div>

      {error && (
        <div className="rounded-card border border-red-500/20 bg-red-500/5 p-5 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-card border border-border bg-surface h-24" />
            ))}
          </div>
          <div className="rounded-card border border-border bg-surface h-48" />
        </div>
      )}

      {data && (
        <>
          {/* Pool stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total Assets (TVL)"
              value={formatUsdc(data.totalAssets)}
              sub="pool deposits"
              accent
            />
            <StatCard
              label="Available Cash"
              value={formatUsdc(data.cash)}
              sub="liquid reserves"
            />
            <StatCard
              label="Principal Out"
              value={formatUsdc(data.totalPrincipalOut)}
              sub="borrowed capital"
            />
            <StatCard
              label="Utilization"
              value={`${(data.utilizationBps / 100).toFixed(1)}%`}
              sub={`${data.utilizationBps} bps`}
            />
          </div>

          {/* Utilization bar */}
          <div className="rounded-card border border-border bg-surface p-5">
            <div className="flex items-center justify-between mb-3 text-xs text-text-muted">
              <span className="font-medium uppercase tracking-wider">Pool Utilization</span>
              <span className="tabular-nums">{(data.utilizationBps / 100).toFixed(2)}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-surface-3 overflow-hidden">
              <div
                className={[
                  "h-full rounded-full transition-all duration-700",
                  data.utilizationBps > 8000 ? "bg-red-400" :
                  data.utilizationBps > 5000 ? "bg-amber-400" : "bg-accent",
                ].join(" ")}
                style={{ width: `${Math.min(100, data.utilizationBps / 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-text-muted">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Tier table */}
          <div className="rounded-card border border-border bg-surface p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-4">
              Credit Tiers
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-muted border-b border-border">
                    <th className="pb-3 font-medium pr-6">Tier</th>
                    <th className="pb-3 font-medium pr-6">Min Score</th>
                    <th className="pb-3 font-medium pr-6">Credit Limit</th>
                    <th className="pb-3 font-medium">Fee Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.tiers.map((tier, i) => (
                    <TierRow key={i} tier={tier} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active loans */}
          <div className="rounded-card border border-border bg-surface p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-4">
              Active Loans ({data.loans.length})
            </h2>
            {data.loans.length === 0 ? (
              <p className="text-sm text-text-muted py-4 text-center">
                No active loans — agents have not borrowed yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.loans.map((loan) => (
                  <LoanRow key={loan.agentId} loan={loan} />
                ))}
              </div>
            )}
          </div>

          {/* Mechanism explainer */}
          <div className="rounded-card border border-border-subtle bg-surface-2/40 p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
              How Borrowing Works
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm text-text-secondary">
              <div>
                <div className="font-medium text-text-primary mb-1">Reputation-gated</div>
                Score determines credit limit. Run settlements, improve your score, unlock more capital.
              </div>
              <div>
                <div className="font-medium text-text-primary mb-1">Under-collateralized</div>
                No over-collateralization required — on-chain track record is the collateral.
              </div>
              <div>
                <div className="font-medium text-text-primary mb-1">Automated enforcement</div>
                Missed repayments trigger score penalties and default marking, raising fees for future loans.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TierRow({ tier }: { tier: CreditTier }) {
  // Map minScore to our tier labels
  const label =
    tier.minScore >= 800 ? "Prime" :
    tier.minScore >= 500 ? "Established" :
    tier.minScore >= 200 ? "Emerging" : "Untrusted";
  const styles = TIER_STYLES[label as keyof typeof TIER_STYLES];

  return (
    <tr className="text-sm">
      <td className="py-3 pr-6">
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border",
            styles.bg, styles.text, styles.border,
          ].join(" ")}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
          {label}
        </span>
      </td>
      <td className="py-3 pr-6 tabular-nums text-text-secondary">{tier.minScore}+</td>
      <td className="py-3 pr-6 font-medium text-text-primary">{formatUsdc(tier.creditLimit)}</td>
      <td className="py-3 text-text-secondary">{formatFeeBps(tier.feeBps)}</td>
    </tr>
  );
}

function LoanRow({ loan }: { loan: AgentLoan }) {
  const name = agentNameFromUri(loan.uri, loan.agentId);
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <Link
            href={`/agent/${loan.agentId}`}
            className="font-medium text-text-primary hover:text-accent transition-colors text-sm"
          >
            {name}
          </Link>
          <div className="text-xs font-mono text-text-muted mt-0.5">
            #{loan.agentId} · {shortAddress(loan.controller)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TierPill score={loan.score} size="sm" />
          {loan.defaulted && (
            <span className="rounded-full px-2 py-0.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20">
              Defaulted
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <LoanStat label="Principal" value={formatUsdc(loan.principal)} />
        <LoanStat label="Fee Owed" value={formatUsdc(loan.feeOwed)} />
        <LoanStat
          label="Due Date"
          value={loan.dueDate > 0 ? formatTimestamp(loan.dueDate) : "—"}
          warn={loan.dueDate > 0 && loan.dueDate < Date.now() / 1000}
        />
        <LoanStat label="Available Credit" value={formatUsdc(loan.availableCredit)} />
      </div>
    </div>
  );
}

function LoanStat({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <div className="text-text-muted mb-0.5">{label}</div>
      <div className={`font-medium ${warn ? "text-red-400" : "text-text-primary"}`}>{value}</div>
    </div>
  );
}
