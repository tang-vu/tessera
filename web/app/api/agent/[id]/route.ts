/**
 * GET /api/agent/[id] — full agent detail: stats, score history from ScoreUpdated events,
 * receipts from ReceiptAnchored events, open loan from CreditLine.
 */
import { NextResponse } from "next/server";
import { getPublicClient, getDeployment, CHAIN_ID } from "@/lib/chain-client";
import {
  AGENT_REGISTRY_ABI,
  REPUTATION_ORACLE_ABI,
  CREDIT_POLICY_ABI,
  RECEIPT_VERIFIER_ABI,
  CREDIT_LINE_ABI,
} from "@/lib/generated/abis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface ScoreEvent {
  index: number;
  blockNumber: string;
  newScore: number;
  delta: number;
  reason: string;
}

export interface ReceiptEvent {
  settlementId: string;
  receiptHash: string;
  signer: string;
  anchoredAt: number;
  blockNumber: string;
}

export interface AgentDetail {
  id: number;
  controller: string;
  uri: string;
  registeredAt: number;
  score: number;
  settlements: number;
  failures: number;
  disputesLost: number;
  defaults: number;
  volume: string;
  lastUpdate: number;
  creditLimit: string;
  feeBps: number;
  availableCredit: string;
  loan: {
    principal: string;
    feeOwed: string;
    dueDate: number;
    defaulted: boolean;
  };
  scoreHistory: ScoreEvent[];
  receipts: ReceiptEvent[];
  chainId: number;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id < 1) {
      return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });
    }
    const bigId = BigInt(id);
    const client = getPublicClient();
    const d = getDeployment();

    const [agentData, statsData] = await Promise.all([
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
    ]);

    const [controller, uri, registeredAt] = agentData as [string, string, bigint];
    const [score, settlements, failures, disputesLost, defaults, volume, lastUpdate] =
      statsData as [bigint, number, number, number, number, bigint, bigint];

    const [creditLimit, feeBps] = (await client.readContract({
      address: d.CreditPolicy,
      abi: CREDIT_POLICY_ABI,
      functionName: "terms",
      args: [score],
    })) as [bigint, number];

    const [availableCredit, loanData] = await Promise.all([
      client.readContract({
        address: d.CreditLine,
        abi: CREDIT_LINE_ABI,
        functionName: "availableCredit",
        args: [bigId],
      }) as Promise<bigint>,
      client.readContract({
        address: d.CreditLine,
        abi: CREDIT_LINE_ABI,
        functionName: "loans",
        args: [bigId],
      }) as Promise<[bigint, bigint, bigint, boolean]>,
    ]);

    const [principal, feeOwed, dueDate, defaulted] = loanData;

    // Fetch ScoreUpdated events for score history chart
    const scoreEvents = await client.getLogs({
      address: d.ReputationOracle,
      event: {
        type: "event",
        name: "ScoreUpdated",
        inputs: [
          { name: "agentId", type: "uint256", indexed: true },
          { name: "newScore", type: "uint256", indexed: false },
          { name: "delta", type: "int256", indexed: false },
          { name: "reason", type: "string", indexed: false },
        ],
      },
      args: { agentId: bigId },
      fromBlock: 0n,
      toBlock: "latest",
    });

    const scoreHistory: ScoreEvent[] = scoreEvents.map((log, idx) => ({
      index: idx,
      blockNumber: log.blockNumber?.toString() ?? "0",
      newScore: Number((log.args as { newScore: bigint }).newScore),
      delta: Number((log.args as { delta: bigint }).delta),
      reason: String((log.args as { reason: string }).reason ?? ""),
    }));

    // Fetch ReceiptAnchored events
    const receiptEvents = await client.getLogs({
      address: d.ReceiptVerifier,
      event: {
        type: "event",
        name: "ReceiptAnchored",
        inputs: [
          { name: "agentId", type: "uint256", indexed: true },
          { name: "settlementId", type: "bytes32", indexed: true },
          { name: "receiptHash", type: "bytes32", indexed: false },
          { name: "signer", type: "address", indexed: false },
        ],
      },
      args: { agentId: bigId },
      fromBlock: 0n,
      toBlock: "latest",
    });

    // Get timestamps for receipt events
    const receipts: ReceiptEvent[] = await Promise.all(
      receiptEvents.map(async (log) => {
        let anchoredAt = 0;
        try {
          const block = await client.getBlock({ blockNumber: log.blockNumber! });
          anchoredAt = Number(block.timestamp);
        } catch {
          // block timestamp unavailable
        }
        const args = log.args as { settlementId: string; receiptHash: string; signer: string };
        return {
          settlementId: args.settlementId ?? "",
          receiptHash: args.receiptHash ?? "",
          signer: args.signer ?? "",
          anchoredAt,
          blockNumber: log.blockNumber?.toString() ?? "0",
        };
      })
    );

    const detail: AgentDetail = {
      id,
      controller,
      uri,
      registeredAt: Number(registeredAt),
      score: Number(score),
      settlements: Number(settlements),
      failures: Number(failures),
      disputesLost: Number(disputesLost),
      defaults: Number(defaults),
      volume: volume.toString(),
      lastUpdate: Number(lastUpdate),
      creditLimit: creditLimit.toString(),
      feeBps: Number(feeBps),
      availableCredit: availableCredit.toString(),
      loan: {
        principal: principal.toString(),
        feeOwed: feeOwed.toString(),
        dueDate: Number(dueDate),
        defaulted,
      },
      scoreHistory,
      receipts,
      chainId: CHAIN_ID,
    };

    return NextResponse.json(detail);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
