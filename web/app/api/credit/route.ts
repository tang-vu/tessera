/**
 * GET /api/credit — lending pool stats, tier table, and agents with open loans.
 */
import { NextResponse } from "next/server";
import { getPublicClient, getDeployment } from "@/lib/chain-client";
import {
  CREDIT_LINE_ABI,
  CREDIT_POLICY_ABI,
  AGENT_REGISTRY_ABI,
  REPUTATION_ORACLE_ABI,
} from "@/lib/generated/abis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface CreditTier {
  minScore: number;
  creditLimit: string;
  feeBps: number;
}

export interface AgentLoan {
  agentId: number;
  controller: string;
  uri: string;
  score: number;
  principal: string;
  feeOwed: string;
  dueDate: number;
  defaulted: boolean;
  availableCredit: string;
}

export interface CreditPoolResponse {
  cash: string;
  totalAssets: string;
  totalShares: string;
  totalPrincipalOut: string;
  utilizationBps: number;
  tiers: CreditTier[];
  loans: AgentLoan[];
  chainId: number;
}

export async function GET() {
  try {
    const client = getPublicClient();
    const d = getDeployment();

    const [cash, totalAssets, totalShares, totalPrincipalOut] = await Promise.all([
      client.readContract({ address: d.CreditLine, abi: CREDIT_LINE_ABI, functionName: "cash" }) as Promise<bigint>,
      client.readContract({ address: d.CreditLine, abi: CREDIT_LINE_ABI, functionName: "totalAssets" }) as Promise<bigint>,
      client.readContract({ address: d.CreditLine, abi: CREDIT_LINE_ABI, functionName: "totalShares" }) as Promise<bigint>,
      client.readContract({ address: d.CreditLine, abi: CREDIT_LINE_ABI, functionName: "totalPrincipalOut" }) as Promise<bigint>,
    ]);

    const utilizationBps =
      totalAssets > 0n
        ? Number((totalPrincipalOut * 10_000n) / totalAssets)
        : 0;

    // Credit policy tiers
    const rawTiers = (await client.readContract({
      address: d.CreditPolicy,
      abi: CREDIT_POLICY_ABI,
      functionName: "tiers",
    })) as Array<{ minScore: number; creditLimit: bigint; feeBps: number }>;

    const tiers: CreditTier[] = rawTiers.map((t) => ({
      minScore: Number(t.minScore),
      creditLimit: t.creditLimit.toString(),
      feeBps: Number(t.feeBps),
    }));

    // Agents with open loans
    const agentCount = Number(
      await client.readContract({
        address: d.AgentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: "agentCount",
      })
    );

    const ids = Array.from({ length: agentCount }, (_, i) => i + 1);

    const allLoans = await Promise.all(
      ids.map(async (id) => {
        const bigId = BigInt(id);
        const [agentData, loanData, scoreRaw, available] = await Promise.all([
          client.readContract({
            address: d.AgentRegistry,
            abi: AGENT_REGISTRY_ABI,
            functionName: "getAgent",
            args: [bigId],
          }) as Promise<[string, string, bigint]>,
          client.readContract({
            address: d.CreditLine,
            abi: CREDIT_LINE_ABI,
            functionName: "loans",
            args: [bigId],
          }) as Promise<[bigint, bigint, bigint, boolean]>,
          client.readContract({
            address: d.ReputationOracle,
            abi: REPUTATION_ORACLE_ABI,
            functionName: "scoreOf",
            args: [bigId],
          }) as Promise<bigint>,
          client.readContract({
            address: d.CreditLine,
            abi: CREDIT_LINE_ABI,
            functionName: "availableCredit",
            args: [bigId],
          }) as Promise<bigint>,
        ]);

        const [controller, uri] = agentData;
        const [principal, feeOwed, dueDate, defaulted] = loanData;

        return {
          agentId: id,
          controller,
          uri,
          score: Number(scoreRaw),
          principal: principal.toString(),
          feeOwed: feeOwed.toString(),
          dueDate: Number(dueDate),
          defaulted,
          availableCredit: available.toString(),
        } satisfies AgentLoan;
      })
    );

    // Only include agents with an active loan (principal > 0)
    const loans = allLoans.filter((l) => BigInt(l.principal) > 0n);

    return NextResponse.json({
      cash: cash.toString(),
      totalAssets: totalAssets.toString(),
      totalShares: totalShares.toString(),
      totalPrincipalOut: totalPrincipalOut.toString(),
      utilizationBps,
      tiers,
      loans,
      chainId: d.chainId,
    } satisfies CreditPoolResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
