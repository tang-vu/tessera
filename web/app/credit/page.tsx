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
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="fade-up">
        <h1 className="font-display text-4xl font-bold tracking-tight text-text-primary">
          Credit <span className="text-gradient">Pool</span>
        </h1>
        <p className="mt-3 max-w-2xl text-text-secondary">
          An under-collateralized lending pool powered by on-chain reputation.
          Agents with higher scores unlock larger credit limits and lower fees —
          the on-chain track record <em className="font-serif-italic not-italic">is</em> the collateral.
        </p>
      </div>

      {error && (
        <div className="card p-5 text-sm text-rose-300" style={{ ["--accent-line" as string]: "linear-gradient(90deg,#fb7185,transparent)" }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-24" />
            ))}
          </div>
          <div className="card h-48" />
        </div>
      )}

      {data && (
        <>
          {/* Pool stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Assets (TVL)" value={formatUsdc(data.totalAssets)} sub="pool deposits" accent />
            <StatCard label="Available Cash" value={formatUsdc(data.cash)} sub="liquid reserves" />
            <StatCard label="Principal Out" value={formatUsdc(data.totalPrincipalOut)} sub="borrowed capital" />
            <StatCard label="Utilization" value={`${(data.utilizationBps / 100).toFixed(1)}%`} sub={`${data.utilizationBps} bps`} />
          </div>

          {/* Utilization bar */}
          <div className="card accent-line p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between text-xs text-text-muted">
              <span className="font-display font-semibold uppercase tracking-[0.16em]">Pool Utilization</span>
              <span className="tabular-nums text-text-secondary">{(data.utilizationBps / 100).toFixed(2)}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, data.utilizationBps / 100)}%`,
                  background:
                    data.utilizationBps > 8000
                      ? "linear-gradient(90deg,#fb7185,#f43f5e)"
                      : data.utilizationBps > 5000
                      ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                      : "linear-gradient(90deg,#7c83ff,#22d3ee)",
                  boxShadow: "0 0 14px rgba(124,131,255,0.4)",
                }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-text-muted">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Tier table */}
          <Panel title="Credit Tiers">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-xs text-text-muted">
                    <th className="pb-3 pr-6 font-medium">Tier</th>
                    <th className="pb-3 pr-6 font-medium">Min Score</th>
                    <th className="pb-3 pr-6 font-medium">Credit Limit</th>
                    <th className="pb-3 font-medium">Fee Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {data.tiers.map((tier, i) => (
                    <TierRow key={i} tier={tier} />
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Active loans */}
          <Panel title={`Active Loans (${data.loans.length})`}>
            {data.loans.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">
                No active loans — agents have not borrowed yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.loans.map((loan) => (
                  <LoanRow key={loan.agentId} loan={loan} />
                ))}
              </div>
            )}
          </Panel>

          {/* Mechanism explainer */}
          <Panel title="How Borrowing Works">
            <div className="grid gap-5 text-sm text-text-secondary sm:grid-cols-3">
              <Mechanism
                title="Reputation-gated"
                body="Score determines credit limit. Run settlements, improve your score, unlock more capital."
              />
              <Mechanism
                title="Under-collateralized"
                body="No over-collateralization required — on-chain track record is the collateral."
              />
              <Mechanism
                title="Automated enforcement"
                body="Missed repayments trigger score penalties and default marking, raising fees for future loans."
              />
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 sm:p-6">
      <h2 className="mb-4 font-display text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Mechanism({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-white/[0.02] p-4">
      <div className="mb-1.5 flex items-center gap-2 font-medium text-text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-iris to-cyan" />
        {title}
      </div>
      {body}
    </div>
  );
}

function TierRow({ tier }: { tier: CreditTier }) {
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
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
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
    <div className="rounded-xl border border-hairline bg-white/[0.02] p-4 transition-colors hover:border-hairline-strong">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/agent/${loan.agentId}`}
            className="text-sm font-medium text-text-primary transition-colors hover:text-iris"
          >
            {name}
          </Link>
          <div className="mt-0.5 font-mono text-xs text-text-muted">
            #{loan.agentId} · {shortAddress(loan.controller)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TierPill score={loan.score} size="sm" />
          {loan.defaulted && (
            <span className="rounded-full border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-300">
              Defaulted
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
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

function LoanStat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="mb-0.5 text-text-muted">{label}</div>
      <div className={`font-medium ${warn ? "text-rose-300" : "text-text-primary"}`}>{value}</div>
    </div>
  );
}
