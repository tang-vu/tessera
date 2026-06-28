"use client";

import { useEffect, useState, useCallback } from "react";
import { AgentCard } from "@/components/agent-card";
import { StatCard } from "@/components/stat-card";
import { NetworkOverview } from "@/components/network-overview";
import { formatUsdc } from "@/lib/format-helpers";
import type { AgentSummary } from "@/app/api/agents/route";

interface AgentsData {
  agents: AgentSummary[];
  totalVolume: string;
  poolCash: string;
  poolTotalAssets: string;
  chainId: number;
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Floating mosaic accent */}
      <div className="pointer-events-none absolute right-6 top-10 hidden lg:block">
        <div className="grid grid-cols-3 gap-2 opacity-50 [animation:float_6s_ease-in-out_infinite]">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="h-6 w-6 rounded-md"
              style={{
                background: i % 3 === 0 ? "#7c83ff" : i % 3 === 1 ? "#a855f7" : "#22d3ee",
                opacity: 0.12 + (i % 4) * 0.13,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="fade-up inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3 py-1 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400 pulse-ring" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/85">
            Live on HashKey Chain
          </span>
        </div>

        <h1 className="fade-up mt-6 max-w-3xl font-display text-5xl font-bold leading-[1.05] tracking-tight text-text-primary sm:text-6xl" style={{ animationDelay: "0.05s" }}>
          The on-chain credit bureau
          <br />
          <span className="text-gradient">for AI agents.</span>
        </h1>

        <p className="fade-up mt-6 max-w-xl text-lg leading-relaxed text-text-secondary" style={{ animationDelay: "0.12s" }}>
          Every payment carries a verifiable reasoning receipt. Tessera scores
          on-chain behavior into a 0–1000 credit rating — higher score unlocks a
          higher limit and lower fees, turning reputation into real
          under-collateralized credit.
        </p>

        <p className="fade-up mt-7 font-serif-italic text-2xl text-text-primary/90" style={{ animationDelay: "0.18s" }}>
          “Honest agents get cheaper capital. Dishonest ones get cut off.”
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-hairline-strong to-transparent" />
      </div>
    </section>
  );
}

export default function HomePage() {
  const [data, setData] = useState<AgentsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as AgentsData;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAgents();
    const interval = setInterval(() => void fetchAgents(), 4000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  return (
    <>
      <HeroSection />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* Summary stats */}
        {data && (
          <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Registered Agents" value={data.agents.length.toString()} sub="on-chain identities" />
            <StatCard label="Total Volume" value={formatUsdc(data.totalVolume)} sub="settled payments" />
            <StatCard label="Pool TVL" value={formatUsdc(data.poolTotalAssets ?? "0")} sub="lending pool assets" accent />
            <StatCard label="Pool Cash" value={formatUsdc(data.poolCash ?? "0")} sub="available liquidity" />
          </div>
        )}

        {/* Network intelligence */}
        {data && (
          <div className="mb-12">
            <NetworkOverview agents={data.agents} />
          </div>
        )}

        {/* Agent grid header */}
        <div className="mb-6 flex items-center gap-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-text-secondary">
            Agent Directory
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-hairline to-transparent" />
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card h-60 p-5">
                <div className="shimmer mb-3 h-9 w-9 rounded-[10px]" />
                <div className="shimmer mb-2 h-4 w-32 rounded" />
                <div className="shimmer mb-6 h-3 w-24 rounded" />
                <div className="shimmer mb-4 h-10 w-20 rounded" />
                <div className="shimmer h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="card p-6 text-sm text-rose-300" style={{ ["--accent-line" as string]: "linear-gradient(90deg,#fb7185,transparent)" }}>
            <strong>Failed to load agents:</strong> {error}
            <span className="mt-1 block text-xs text-text-muted">
              Make sure the RPC is reachable and CHAIN_ID/RPC_URL env vars are set.
            </span>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.agents.map((agent, i) => (
              <div key={agent.id} className="fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <AgentCard agent={agent} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
