/**
 * Pure aggregation of the agent set into network-level credit metrics.
 * Extracted from the NetworkOverview component so it can be unit-tested.
 */
import { tierFromScore, type Tier } from "@/lib/format-helpers";
import type { AgentSummary } from "@/app/api/agents/route";

export interface NetworkStats {
  count: number;
  counts: Record<Tier, number>;
  avgScore: number;
  /** Successful settlements as a % of all settlement attempts (0–100). */
  reliability: number;
  /** Sum of every agent's credit limit, in USDC base units (string for bigint safety). */
  capacity: string;
  settlements: number;
}

export function computeNetworkStats(agents: AgentSummary[]): NetworkStats {
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

  const count = agents.length;
  const totalActions = settlements + failures;

  return {
    count,
    counts,
    avgScore: count === 0 ? 0 : Math.round(scoreSum / count),
    reliability: totalActions === 0 ? 100 : (settlements / totalActions) * 100,
    capacity: capacity.toString(),
    settlements,
  };
}
