import { pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";
import type { Account, Hex } from "viem";
import { chain, RPC_URL, loadDeployment, requireEnv, type Deployment } from "./config";
import { makePublicClient, makeWalletClient, accountFromKey } from "./chain";
import { buildMandateChain, type BuildMandateParams } from "./mandate";
import { createReceipt, type ReasoningTrace } from "./receipt";
import {
  AGENT_REGISTRY_ABI,
  RECEIPT_VERIFIER_ABI,
  REPUTATION_ORACLE_ABI,
  CREDIT_POLICY_ABI,
  SETTLEMENT_HOOK_ABI,
  MOCK_USDC_ABI,
} from "./generated/abis";

export interface SettlementInput extends BuildMandateParams {
  agentAccount: Account;
  agentId: number;
  onTime?: boolean;
  deployment?: Deployment;
}

export interface SettlementResult {
  settlementId: Hex;
  receiptHash: Hex;
  receiptUri: string;
  storageBackend: string;
  anchorTx: Hex;
  settleTx: Hex;
  scoreBefore: number;
  scoreAfter: number;
  terms: { creditLimit: string; feeBps: number };
  trace: ReasoningTrace;
}

/**
 * Full demo loop for one settlement: build AP2 mandate chain → generate + store reasoning receipt →
 * sign + anchor it → approve stablecoin → settle (mock HSP) → read updated score + credit terms.
 */
export async function runSettlement(input: SettlementInput): Promise<SettlementResult> {
  const d = input.deployment ?? loadDeployment();
  const pub = makePublicClient(chain, RPC_URL);
  const wallet = makeWalletClient(chain, RPC_URL, input.agentAccount);
  const agentId = BigInt(input.agentId);

  const mandate = buildMandateChain(input);
  const receipt = await createReceipt(input.agentId, mandate);

  const scoreBefore = Number(
    await pub.readContract({
      address: d.ReputationOracle,
      abi: REPUTATION_ORACLE_ABI,
      functionName: "scoreOf",
      args: [agentId],
    }),
  );

  // 1. Agent controller signs the receipt hash (EIP-191) and anchors it.
  const signature = await wallet.signMessage({
    account: input.agentAccount,
    message: { raw: receipt.receiptHash },
  });
  const anchorTx = await wallet.writeContract({
    address: d.ReceiptVerifier,
    abi: RECEIPT_VERIFIER_ABI,
    functionName: "anchorReceipt",
    args: [agentId, mandate.settlementId, receipt.receiptHash, signature],
    chain,
    account: input.agentAccount,
  });
  await pub.waitForTransactionReceipt({ hash: anchorTx });

  // 2. Approve the stablecoin allowance for the settlement hook.
  const approveTx = await wallet.writeContract({
    address: d.Stablecoin,
    abi: MOCK_USDC_ABI,
    functionName: "approve",
    args: [d.SettlementHook, input.amount],
    chain,
    account: input.agentAccount,
  });
  await pub.waitForTransactionReceipt({ hash: approveTx });

  // 3. Settle (mock HSP) — transfers stablecoin and records reputation.
  const settleTx = await wallet.writeContract({
    address: d.SettlementHook,
    abi: SETTLEMENT_HOOK_ABI,
    functionName: "settle",
    args: [agentId, input.payee, input.amount, mandate.settlementId, input.onTime ?? true],
    chain,
    account: input.agentAccount,
  });
  await pub.waitForTransactionReceipt({ hash: settleTx });

  const scoreAfter = Number(
    await pub.readContract({
      address: d.ReputationOracle,
      abi: REPUTATION_ORACLE_ABI,
      functionName: "scoreOf",
      args: [agentId],
    }),
  );
  const [creditLimit, feeBps] = (await pub.readContract({
    address: d.CreditPolicy,
    abi: CREDIT_POLICY_ABI,
    functionName: "terms",
    args: [BigInt(scoreAfter)],
  })) as [bigint, number];

  return {
    settlementId: mandate.settlementId,
    receiptHash: receipt.receiptHash,
    receiptUri: receipt.stored.uri,
    storageBackend: receipt.stored.backend,
    anchorTx,
    settleTx,
    scoreBefore,
    scoreAfter,
    terms: { creditLimit: creditLimit.toString(), feeBps: Number(feeBps) },
    trace: receipt.trace,
  };
}

/** Ensure the account is registered as an agent; returns its agentId. */
export async function ensureRegistered(account: Account, metadataURI: string, deployment?: Deployment): Promise<number> {
  const d = deployment ?? loadDeployment();
  const pub = makePublicClient(chain, RPC_URL);
  const existing = Number(
    await pub.readContract({
      address: d.AgentRegistry,
      abi: AGENT_REGISTRY_ABI,
      functionName: "agentIdOf",
      args: [account.address],
    }),
  );
  if (existing > 0) return existing;
  const wallet = makeWalletClient(chain, RPC_URL, account);
  const tx = await wallet.writeContract({
    address: d.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "register",
    args: [account.address, metadataURI],
    chain,
    account,
  });
  await pub.waitForTransactionReceipt({ hash: tx });
  return Number(
    await pub.readContract({
      address: d.AgentRegistry,
      abi: AGENT_REGISTRY_ABI,
      functionName: "agentIdOf",
      args: [account.address],
    }),
  );
}

// CLI: run a single demo settlement using AGENT_PRIVATE_KEY.
async function main() {
  const account = accountFromKey(requireEnv("AGENT_PRIVATE_KEY"));
  const agentId = await ensureRegistered(account, process.env.AGENT_METADATA ?? "ipfs://tessera-agent");
  const payee = (process.env.PAYEE ?? "0x000000000000000000000000000000000000dEaD") as `0x${string}`;
  const amount = BigInt(process.env.AMOUNT ?? "1000000000"); // 1000 USDC (6 decimals)
  console.log(`Settling for agent #${agentId} (${account.address})...`);
  const result = await runSettlement({
    agentAccount: account,
    agentId,
    description: process.env.INTENT ?? "Pay merchant for API usage",
    merchantId: "merchant-demo",
    merchantName: "Demo Merchant",
    payee,
    amount,
    onTime: true,
  });
  console.log(JSON.stringify(result, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
  console.log(`Score: ${result.scoreBefore} → ${result.scoreAfter} | limit ${result.terms.creditLimit} fee ${result.terms.feeBps}bps`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
