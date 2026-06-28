import Link from "next/link";
import { TierPill } from "./tier-pill";
import {
  agentNameFromUri,
  formatUsdc,
  formatFeeBps,
  shortAddress,
  tierFromScore,
  TIER_STYLES,
} from "@/lib/format-helpers";
import type { AgentSummary } from "@/app/api/agents/route";

interface AgentCardProps {
  agent: AgentSummary;
}

/** Deterministic 4-tile mosaic glyph seeded by the agent id — a unique mark per agent. */
function AgentGlyph({ id, hex }: { id: number; hex: string }) {
  const bits = [id & 1, (id >> 1) & 1, (id >> 2) & 1, (id >> 3) & 1];
  return (
    <span className="grid h-9 w-9 grid-cols-2 gap-0.5 rounded-[10px] border border-hairline bg-bg-2 p-1">
      {bits.map((b, i) => (
        <span
          key={i}
          className="rounded-[3px]"
          style={{ background: hex, opacity: b ? 0.9 : 0.22 }}
        />
      ))}
    </span>
  );
}

export function AgentCard({ agent }: AgentCardProps) {
  const name = agentNameFromUri(agent.uri, agent.id);
  const tier = tierFromScore(agent.score);
  const { hex } = TIER_STYLES[tier];

  return (
    <Link
      href={`/agent/${agent.id}`}
      className="card card-hover accent-line block p-5"
      style={{ ["--accent-line" as string]: `linear-gradient(90deg, ${hex}, transparent 80%)` }}
    >
      {/* Header row */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AgentGlyph id={agent.id} hex={hex} />
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold text-text-primary">
              {name}
            </h3>
            <p className="mt-0.5 font-mono text-xs text-text-muted">
              #{agent.id} · {shortAddress(agent.controller)}
            </p>
          </div>
        </div>
        <TierPill score={agent.score} />
      </div>

      {/* Score — big number tinted by tier */}
      <div className="mb-3 flex items-end gap-2">
        <div
          className="font-display text-5xl font-bold tabular-nums leading-none tracking-tight"
          style={{ color: hex, textShadow: `0 0 24px ${TIER_STYLES[tier].glow}` }}
        >
          {agent.score}
        </div>
        <div className="mb-1 text-xs text-text-muted">/ 1000</div>
      </div>

      {/* Score bar */}
      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${(agent.score / 1000) * 100}%`,
            background: `linear-gradient(90deg, ${hex}, #a855f7)`,
            boxShadow: `0 0 12px ${TIER_STYLES[tier].glow}`,
          }}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5">
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
    <div className="rounded-xl border border-hairline bg-white/[0.02] px-3 py-2">
      <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className={`text-sm font-semibold ${accent ? "text-rose-300" : "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}
