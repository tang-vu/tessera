"use client";

import { useEffect, useState, useCallback } from "react";
import { AgentCard } from "@/components/agent-card";
import { StatCard } from "@/components/stat-card";
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
    <section className="border-b border-border-subtle bg-surface/40 px-4 sm:px-6 py-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-medium uppercase tracking-widest text-accent">
            HashKey Chain · Testnet
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text-primary mb-4 max-w-2xl leading-tight">
          On-Chain Credit Bureau<br />
          <span className="text-accent">for AI Agents</span>
        </h1>
        <p className="text-lg text-text-secondary max-w-xl leading-relaxed mb-6">
          Every payment carries a verifiable reasoning receipt. Tessera scores
          on-chain behavior into a 0–1000 credit rating. Higher score = higher
          limit + lower fees.
        </p>
        <p className="text-sm font-medium text-text-muted italic">
          "Honest agents get cheaper capital. Dishonest ones get cut off."
        </p>
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        {/* Summary stats */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <StatCard
              label="Registered Agents"
              value={data.agents.length.toString()}
              sub="on-chain identities"
            />
            <StatCard
              label="Total Volume"
              value={formatUsdc(data.totalVolume)}
              sub="settled payments"
            />
            <StatCard
              label="Pool TVL"
              value={formatUsdc(data.poolTotalAssets ?? "0")}
              sub="lending pool assets"
              accent
            />
            <StatCard
              label="Pool Cash"
              value={formatUsdc(data.poolCash ?? "0")}
              sub="available liquidity"
            />
          </div>
        )}

        {/* Agent grid */}
        <div className="mb-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
            Agent Directory
          </h2>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-card border border-border bg-surface p-5 h-56 animate-pulse"
              >
                <div className="h-4 w-32 bg-surface-3 rounded mb-3" />
                <div className="h-3 w-24 bg-surface-3 rounded mb-6" />
                <div className="h-10 w-20 bg-surface-3 rounded mb-2" />
                <div className="h-1.5 w-full bg-surface-3 rounded" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-card border border-red-500/20 bg-red-500/5 p-6 text-red-400 text-sm">
            <strong>Failed to load agents:</strong> {error}
            <br />
            <span className="text-text-muted text-xs mt-1 block">
              Make sure anvil is running and CHAIN_ID/RPC_URL env vars are set.
            </span>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
