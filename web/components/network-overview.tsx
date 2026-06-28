"use client";

/**
 * NetworkOverview — aggregate "credit bureau" intelligence derived entirely
 * from the on-chain agent set: tier distribution + network-level KPIs.
 * Turns a flat directory into a portfolio-level view of network health.
 */
import { formatUsdc, tierFromScore, TIER_STYLES, type Tier } from "@/lib/format-helpers";
import type { AgentSummary } from "@/app/api/agents/route";

const TIER_ORDER: Tier[] = ["Untrusted", "Emerging", "Established", "Prime"];

export function NetworkOverview({ agents }: { agents: AgentSummary[] }) {
  if (agents.length === 0) return null;

  const counts: Record<Tier, number> = {
    Untrusted: 0,
    Emerging: 0,
    Established: 0,
    Prime: 0,
  };
  let scoreSum = 0;
  let settlements = 0;
  let failures = 0;
  let capacity = 0n;
  for (const a of agents) {
    counts[tierFromScore(a.score)]++;
    scoreSum += a.score;
    settlements += a.settlements;
    failures += a.failures;
    capacity += BigInt(a.creditLimit);
  }

  const avgScore = Math.round(scoreSum / agents.length);
  const totalActions = settlements + failures;
  const reliability = totalActions === 0 ? 100 : (settlements / totalActions) * 100;

  return (
    <div className="card accent-line p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
          Network Intelligence
        </h2>
        <span className="h-1.5 w-1.5 rounded-full bg-teal-400 pulse-ring" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Tier distribution */}
        <div>
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-text-muted">
            <span>Credit tier distribution</span>
            <span className="tabular-nums">{agents.length} agents</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.05]">
            {TIER_ORDER.map((t) =>
              counts[t] > 0 ? (
                <div
                  key={t}
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${(counts[t] / agents.length) * 100}%`,
                    background: TIER_STYLES[t].hex,
                    boxShadow: `0 0 12px ${TIER_STYLES[t].glow}`,
                  }}
                  title={`${t}: ${counts[t]}`}
                />
              ) : null
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
            {TIER_ORDER.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: TIER_STYLES[t].hex }} />
                <span className="text-xs text-text-secondary">{t}</span>
                <span className="ml-auto font-display text-sm font-semibold tabular-nums text-text-primary">
                  {counts[t]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <Kpi label="Avg Score" value={avgScore.toString()} gradient />
          <Kpi label="Reliability" value={`${reliability.toFixed(1)}%`} />
          <Kpi label="Credit Capacity" value={formatUsdc(capacity.toString())} />
          <Kpi label="Settlements" value={settlements.toLocaleString()} />
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, gradient = false }: { label: string; value: string; gradient?: boolean }) {
  return (
    <div className="rounded-xl border border-hairline bg-white/[0.02] px-3.5 py-3">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</div>
      <div className={`font-display text-lg font-bold tabular-nums ${gradient ? "text-gradient" : "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}
