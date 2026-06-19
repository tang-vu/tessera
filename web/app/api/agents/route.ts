/**
 * GET /api/agents — returns all registered agents with scores and credit terms.
 * Server-side chain reads via viem to avoid browser→RPC CORS issues.
 */
import { NextResponse } from "next/server";
import { getPublicClient, getDeployment } from "@/lib/chain-client";
import {
  AGENT_REGISTRY_ABI,
  REPUTATION_ORACLE_ABI,
  CREDIT_POLICY_ABI,
  SETTLEMENT_HOOK_ABI,
} from "@/lib/generated/abis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface AgentSummary {
  id: number;
  controller: string;
  uri: string;
  registeredAt: number;
  score: number;
  settlements: number;
  failures: number;
  volume: string;
  creditLimit: string;
  feeBps: number;
}

export interface AgentsResponse {
  agents: AgentSummary[];
  totalVolume: string;
  chainId: number;
}

export async function GET() {
  try {
    const client = getPublicClient();
    const d = getDeployment();

    const agentCount = Number(
      await client.readContract({
        address: d.AgentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: "agentCount",
      })
    );

    const ids = Array.from({ length: agentCount }, (_, i) => i + 1);

    const agents: AgentSummary[] = await Promise.all(
      ids.map(async (id) => {
        const bigId = BigInt(id);

        const [agentData, statsData, termsFromScore] = await Promise.all([
          client.readContract({
            address: d.AgentRegistry,
            abi: AGENT_REGISTRY_ABI,
            functionName: "getAgent",
            args: [bigId],
          }),
          client.readContract({
            address: d.ReputationOracle,
            abi: REPUTATION_ORACLE_ABI,
            functionName: "stats",
            args: [bigId],
          }),
          // Will resolve after stats
          null,
        ]);

        const [controller, uri, registeredAt] = agentData as [string, string, bigint];
        const [score, settlements, failures, , , volume] = statsData as [bigint, number, number, number, number, bigint, bigint];

        const [creditLimit, feeBps] = await client.readContract({
          address: d.CreditPolicy,
          abi: CREDIT_POLICY_ABI,
          functionName: "terms",
          args: [score],
        }) as [bigint, number];

        void termsFromScore;

        return {
          id,
          controller,
          uri,
          registeredAt: Number(registeredAt),
          score: Number(score),
          settlements: Number(settlements),
          failures: Number(failures),
          volume: volume.toString(),
          creditLimit: creditLimit.toString(),
          feeBps: Number(feeBps),
        };
      })
    );

    // Pool TVL from CreditLine
    let poolCash = "0";
    let poolTotalAssets = "0";
    try {
      const [cash, totalAssets] = await Promise.all([
        client.readContract({ address: d.CreditLine, abi: [{ type: "function", name: "cash", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" }], functionName: "cash" }) as Promise<bigint>,
        client.readContract({ address: d.CreditLine, abi: [{ type: "function", name: "totalAssets", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" }], functionName: "totalAssets" }) as Promise<bigint>,
      ]);
      poolCash = cash.toString();
      poolTotalAssets = totalAssets.toString();
    } catch {
      // pool may be empty on fresh deploy
    }

    const totalVolume = agents.reduce((acc, a) => acc + BigInt(a.volume), 0n).toString();

    return NextResponse.json({
      agents,
      totalVolume,
      poolCash,
      poolTotalAssets,
      chainId: d.chainId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
