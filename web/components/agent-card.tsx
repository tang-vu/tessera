import Link from "next/link";
import { TierPill } from "./tier-pill";
import {
  agentNameFromUri,
  formatUsdc,
  formatFeeBps,
  shortAddress,
} from "@/lib/format-helpers";
import type { AgentSummary } from "@/app/api/agents/route";

interface AgentCardProps {
  agent: AgentSummary;
}

export function AgentCard({ agent }: AgentCardProps) {
  const name = agentNameFromUri(agent.uri, agent.id);

  return (
    <Link
      href={`/agent/${agent.id}`}
      className="group block rounded-card border border-border bg-surface p-5 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all duration-200"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
            {name}
          </h3>
          <p className="mt-0.5 font-mono text-xs text-text-muted">
            #{agent.id} · {shortAddress(agent.controller)}
          </p>
        </div>
        <TierPill score={agent.score} />
      </div>

      {/* Score — big number */}
      <div className="mb-4">
        <div className="text-4xl font-bold tabular-nums tracking-tight text-text-primary">
          {agent.score}
        </div>
        <div className="text-xs text-text-muted mt-0.5">credit score / 1000</div>
      </div>

      {/* Score bar */}
      <div className="mb-5 h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${(agent.score / 1000) * 100}%` }}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Credit Limit" value={formatUsdc(agent.creditLimit)} />
        <Stat label="Fee Rate" value={formatFeeBps(agent.feeBps)} />
        <Stat label="Settlements" value={agent.settlements.toLocaleString()} />
        <Stat label="Failures" value={agent.failures.toLocaleString()} accent={agent.failures > 0} />
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted mb-0.5">
        {label}
      </div>
      <div className={`text-sm font-semibold ${accent ? "text-red-400" : "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}
