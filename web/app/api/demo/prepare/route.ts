/**
 * POST /api/demo/prepare — wallet-path preparation endpoint.
 *
 * Given a connected wallet address, this route:
 *   1. Registers the address as an agent (via deployer wallet) if not already registered.
 *   2. Mints 2000 MockUSDC + sends 0.02 ETH gas if balances are low (mock networks only).
 *   3. Builds an AP2 mandate chain + generates a reasoning receipt (no on-chain tx).
 *   4. Returns { agentId, settlementId, receiptHash, receiptUri, payee, amount, trace }
 *      so the browser can sign + submit the remaining txs itself.
 *
 * Private key never leaves the server. Receipt signing happens client-side.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAddress, parseEther } from "viem";
import {
  accountFromKey,
  makePublicClient,
  makeWalletClient,
  loadDeployment,
  chainById,
  buildMandateChain,
  createReceipt,
} from "@tessera/agent";
import { AGENT_REGISTRY_ABI, MOCK_USDC_ABI, REPUTATION_ORACLE_ABI } from "@/lib/generated/abis";
import { CHAIN_ID, RPC_URL } from "@/lib/chain-client";

export const dynamic = "force-dynamic";

const PAYEE = "0x000000000000000000000000000000000000dEaD" as const;
const AMOUNT = 1_000_000_000n; // 1000 USDC (6 decimals)
const MIN_ETH = parseEther("0.01");
const FUND_ETH = parseEther("0.02");
const MINT_USDC = 2_000_000_000n; // 2000 USDC

interface PrepareBody {
  address: string;
}

export async function POST(req: NextRequest) {
  try {
    // --- Validate request body ---
    const body = (await req.json()) as PrepareBody;
    if (!body?.address || !isAddress(body.address)) {
      return NextResponse.json(
        { error: "Invalid or missing address in request body" },
        { status: 400 }
      );
    }
    const controllerAddress = body.address as `0x${string}`;

    // --- Server-side setup ---
    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!deployerKey) {
      return NextResponse.json(
        { error: "DEPLOYER_PRIVATE_KEY env var is required" },
        { status: 500 }
      );
    }

    const chain = chainById(CHAIN_ID);
    const deployment = loadDeployment(CHAIN_ID);
    const publicClient = makePublicClient(chain, RPC_URL);
    const deployerAccount = accountFromKey(deployerKey);
    const deployerWallet = makeWalletClient(chain, RPC_URL, deployerAccount);

    // --- Register the connected address as an agent if not already ---
    // The deployer calls register(controller, uri) on behalf of the wallet address.
    // agentIdOf returns 0 when not registered.
    let agentId = Number(
      await publicClient.readContract({
        address: deployment.AgentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: "agentIdOf",
        args: [controllerAddress],
      })
    );

    if (agentId === 0) {
      const regTx = await deployerWallet.writeContract({
        address: deployment.AgentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: "register",
        args: [controllerAddress, `ipfs://tessera-wallet-agent-${controllerAddress.slice(2, 8).toLowerCase()}`],
        chain,
        account: deployerAccount,
      });
      await publicClient.waitForTransactionReceipt({ hash: regTx });

      agentId = Number(
        await publicClient.readContract({
          address: deployment.AgentRegistry,
          abi: AGENT_REGISTRY_ABI,
          functionName: "agentIdOf",
          args: [controllerAddress],
        })
      );
    }

    if (agentId === 0) {
      throw new Error("Registration succeeded but agentIdOf still returned 0");
    }

    // --- Fund the wallet on mock/local networks ---
    if (deployment.stablecoinIsMock) {
      // Mint USDC if needed
      const mintTx = await deployerWallet.writeContract({
        address: deployment.Stablecoin,
        abi: MOCK_USDC_ABI,
        functionName: "mint",
        args: [controllerAddress, MINT_USDC],
        chain,
        account: deployerAccount,
      });
      await publicClient.waitForTransactionReceipt({ hash: mintTx });

      // Top up ETH for gas if below threshold
      const nativeBalance = await publicClient.getBalance({
        address: controllerAddress,
      });
      if (nativeBalance < MIN_ETH) {
        const fundTx = await deployerWallet.sendTransaction({
          to: controllerAddress,
          value: FUND_ETH,
          chain,
          account: deployerAccount,
        });
        await publicClient.waitForTransactionReceipt({ hash: fundTx });
      }
    }

    // --- Read the current on-chain score (the exact "before" value) ---
    const scoreBefore = Number(
      await publicClient.readContract({
        address: deployment.ReputationOracle,
        abi: REPUTATION_ORACLE_ABI,
        functionName: "scoreOf",
        args: [BigInt(agentId)],
      })
    );

    // --- Build mandate chain + create reasoning receipt (no on-chain tx) ---
    const mandateChain = buildMandateChain({
      description: "Wallet demo settlement — user-signed payment via Tessera credit system",
      merchantId: "wallet-demo-merchant",
      merchantName: "Wallet Demo Merchant",
      payee: PAYEE,
      amount: AMOUNT,
      nonce: Date.now(),
    });

    const receipt = await createReceipt(agentId, mandateChain);

    return NextResponse.json({
      agentId,
      scoreBefore,
      settlementId: mandateChain.settlementId,
      receiptHash: receipt.receiptHash,
      receiptUri: receipt.stored.uri,
      payee: PAYEE,
      amount: AMOUNT.toString(),
      trace: receipt.trace,
      chainId: CHAIN_ID,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[demo/prepare] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
