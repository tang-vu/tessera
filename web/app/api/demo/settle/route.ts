/**
 * POST /api/demo/settle — server-driven one-click settlement demo.
 * Picks the "Beacon" agent (index 1 or DEMO_AGENT_INDEX), ensures it has gas + USDC,
 * runs runSettlement, returns scoreBefore/scoreAfter/terms/trace/txs.
 * Never reads private keys from client; all keys from env only.
 */
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEther } from "viem";
import {
  runSettlement,
  ensureRegistered,
  accountFromKey,
  makePublicClient,
  makeWalletClient,
  loadDeployment,
  chainById,
} from "@tessera/agent";
import { MOCK_USDC_ABI } from "@/lib/generated/abis";
import { CHAIN_ID, RPC_URL } from "@/lib/chain-client";

export const dynamic = "force-dynamic";

interface AgentEntry {
  name: string;
  privateKey: string;
  address: string;
}

function loadAgents(): AgentEntry[] {
  // .agents.json lives in agent/ directory (sibling to web/)
  const paths = [
    join(process.cwd(), "..", "agent", ".agents.json"),
    join(process.cwd(), "agent", ".agents.json"),
  ];
  for (const p of paths) {
    try {
      return JSON.parse(readFileSync(p, "utf8")) as AgentEntry[];
    } catch {
      // try next path
    }
  }
  throw new Error("Cannot find agent/.agents.json — tried: " + paths.join(", "));
}

export async function POST() {
  try {
    const agents = loadAgents();

    const demoIndex = Number(process.env.DEMO_AGENT_INDEX ?? 1);
    const demoAgent = agents[demoIndex] ?? agents[1] ?? agents[0];
    if (!demoAgent) throw new Error("No demo agent entry found in .agents.json");

    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!deployerKey) throw new Error("DEPLOYER_PRIVATE_KEY env var is required");

    const chain = chainById(CHAIN_ID);
    const deployment = loadDeployment(CHAIN_ID);
    const publicClient = makePublicClient(chain, RPC_URL);

    const demoAccount = accountFromKey(demoAgent.privateKey);
    const deployerAccount = accountFromKey(deployerKey);
    const deployerWallet = makeWalletClient(chain, RPC_URL, deployerAccount);

    // Ensure demo agent has enough ETH for gas (threshold: 0.01 ETH)
    const nativeBalance = await publicClient.getBalance({ address: demoAccount.address });
    if (nativeBalance < parseEther("0.01")) {
      const fundTx = await deployerWallet.sendTransaction({
        to: demoAccount.address,
        value: parseEther("0.02"),
        chain,
        account: deployerAccount,
      });
      await publicClient.waitForTransactionReceipt({ hash: fundTx });
    }

    // Mint 2000 USDC to demo agent if stablecoin is mock
    if (deployment.stablecoinIsMock) {
      const mintTx = await deployerWallet.writeContract({
        address: deployment.Stablecoin,
        abi: MOCK_USDC_ABI,
        functionName: "mint",
        args: [demoAccount.address, 2_000_000_000n], // 2000 USDC (6 decimals)
        chain,
        account: deployerAccount,
      });
      await publicClient.waitForTransactionReceipt({ hash: mintTx });
    }

    // Ensure the demo agent is registered on-chain
    const agentId = await ensureRegistered(
      demoAccount,
      `ipfs://tessera-agent-${demoAgent.name.toLowerCase()}`,
      deployment
    );

    // Run the full settlement loop
    const result = await runSettlement({
      agentAccount: demoAccount,
      agentId,
      description: "Live demo settlement — AI agent pays merchant via Tessera credit system",
      merchantId: "demo-merchant",
      merchantName: "Demo Merchant",
      payee: "0x000000000000000000000000000000000000dEaD",
      amount: 1_000_000_000n, // 1000 USDC
      onTime: true,
      nonce: Date.now(),
      deployment,
    });

    return NextResponse.json({
      agentId,
      agentName: demoAgent.name,
      agentAddress: demoAccount.address,
      settlementId: result.settlementId,
      receiptHash: result.receiptHash,
      receiptUri: result.receiptUri,
      storageBackend: result.storageBackend,
      anchorTx: result.anchorTx,
      settleTx: result.settleTx,
      scoreBefore: result.scoreBefore,
      scoreAfter: result.scoreAfter,
      terms: result.terms,
      trace: result.trace,
      chainId: CHAIN_ID,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[demo/settle] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
