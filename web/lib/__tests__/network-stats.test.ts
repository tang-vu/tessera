import { describe, it, expect } from "vitest";
import { computeNetworkStats } from "@/lib/network-stats";
import type { AgentSummary } from "@/app/api/agents/route";

function agent(partial: Partial<AgentSummary>): AgentSummary {
  return {
    id: 1,
    controller: "0x0000000000000000000000000000000000000000",
    uri: "ipfs://tessera/x",
    registeredAt: 0,
    score: 500,
    settlements: 0,
    failures: 0,
    volume: "0",
    creditLimit: "0",
    feeBps: 100,
    ...partial,
  };
}

describe("computeNetworkStats", () => {
  it("returns neutral defaults for an empty network", () => {
    const s = computeNetworkStats([]);
    expect(s.count).toBe(0);
    expect(s.avgScore).toBe(0);
    expect(s.reliability).toBe(100);
    expect(s.capacity).toBe("0");
    expect(s.settlements).toBe(0);
  });

  it("aggregates tiers, average, reliability, and capacity", () => {
    const s = computeNetworkStats([
      agent({ score: 900, settlements: 10, failures: 0, creditLimit: "50000000000" }),
      agent({ score: 140, settlements: 1, failures: 2, creditLimit: "0" }),
      agent({ score: 620, settlements: 4, failures: 1, creditLimit: "10000000000" }),
    ]);
    expect(s.count).toBe(3);
    expect(s.counts.Prime).toBe(1);
    expect(s.counts.Established).toBe(1);
    expect(s.counts.Untrusted).toBe(1);
    expect(s.counts.Emerging).toBe(0);
    expect(s.avgScore).toBe(Math.round((900 + 140 + 620) / 3)); // 553
    expect(s.settlements).toBe(15);
    // 15 settlements / (15 + 3 failures) = 83.33%
    expect(s.reliability).toBeCloseTo((15 / 18) * 100, 5);
    // capacity sums via bigint: 50,000 + 10,000 USDC = 60,000 USDC (6 decimals)
    expect(s.capacity).toBe("60000000000");
  });
});
