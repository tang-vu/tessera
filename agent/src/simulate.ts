import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEther, parseUnits, formatUnits, type Account } from "viem";
import { generatePrivateKey } from "viem/accounts";
import { chain, RPC_URL, loadDeployment, requireEnv } from "./config";
import { accountFromKey, makePublicClient, makeWalletClient } from "./chain";
import { runSettlement } from "./settle";
import {
  AGENT_REGISTRY_ABI,
  REPUTATION_ORACLE_ABI,
  CREDIT_POLICY_ABI,
  SETTLEMENT_HOOK_ABI,
  CREDIT_LINE_ABI,
  MOCK_USDC_ABI,
} from "./generated/abis";

const USDC = (n: number) => parseUnits(n.toString(), 6);
const GAS_FUND = parseEther(process.env.GAS_FUND_ETH ?? "0.05");
const PAYEE = (process.env.PAYEE ?? "0x000000000000000000000000000000000000dEaD") as `0x${string}`;
const SETTLE_AMOUNT = USDC(1000); // +40 score each (capped volume bonus + on-time)

// Seed a spread of agents across all four credit tiers.
interface Profile {
  name: string;
  metadata: string;
  settlements: number;
  failures: number;
  disputes: number;
}
const PROFILES: Profile[] = [
  { name: "Atlas", metadata: "ipfs://tessera/atlas", settlements: 10, failures: 0, disputes: 0 }, // Prime (~900)
  { name: "Beacon", metadata: "ipfs://tessera/beacon", settlements: 5, failures: 0, disputes: 0 }, // Established (~700)
  { name: "Dusk", metadata: "ipfs://tessera/dusk", settlements: 3, failures: 0, disputes: 0 }, // Established (~620)
  { name: "Cobalt", metadata: "ipfs://tessera/cobalt", settlements: 1, failures: 0, disputes: 2 }, // Emerging (~380)
  { name: "Ember", metadata: "ipfs://tessera/ember", settlements: 0, failures: 1, disputes: 4 }, // Untrusted (~140)
];

interface SavedAgent {
  name: string;
  privateKey: `0x${string}`;
  address: `0x${string}`;
}

const keysPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".agents.json");

function loadOrCreateAgents(): SavedAgent[] {
  if (existsSync(keysPath)) {
    return JSON.parse(readFileSync(keysPath, "utf8")) as SavedAgent[];
  }
  const agents = PROFILES.map((p) => {
    const pk = generatePrivateKey();
    return { name: p.name, privateKey: pk, address: accountFromKey(pk).address };
  });
  writeFileSync(keysPath, JSON.stringify(agents, null, 2));
  return agents;
}

async function main() {
  const d = loadDeployment();
  const deployer = accountFromKey(requireEnv("DEPLOYER_PRIVATE_KEY"));
  const pub = makePublicClient(chain, RPC_URL);
  const owner = makeWalletClient(chain, RPC_URL, deployer);
  const agents = loadOrCreateAgents();

  console.log(`Seeding ${agents.length} agents on chain ${chain.id} via ${RPC_URL}\n`);

  for (let i = 0; i < PROFILES.length; i++) {
    const profile = PROFILES[i]!;
    const saved = agents[i]!;
    const account = accountFromKey(saved.privateKey);

    const already = Number(
      await pub.readContract({
        address: d.AgentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: "agentIdOf",
        args: [account.address],
      }),
    );
    if (already > 0) {
      console.log(`- ${profile.name} already registered as #${already}, skipping activity.`);
      continue;
    }

    // Register (owner submits), fund gas + stablecoin.
    await waitTx(
      await owner.writeContract({
        address: d.AgentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: "register",
        args: [account.address, profile.metadata],
        chain,
        account: deployer,
      }),
    );
    const agentId = Number(
      await pub.readContract({
        address: d.AgentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: "agentIdOf",
        args: [account.address],
      }),
    );

    if (profile.settlements > 0) {
      await waitTx(await owner.sendTransaction({ account: deployer, to: account.address, value: GAS_FUND, chain }));
      if (d.stablecoinIsMock) {
        await waitTx(
          await owner.writeContract({
            address: d.Stablecoin,
            abi: MOCK_USDC_ABI,
            functionName: "mint",
            args: [account.address, SETTLE_AMOUNT * BigInt(profile.settlements + 1)],
            chain,
            account: deployer,
          }),
        );
      }
    }

    for (let s = 0; s < profile.settlements; s++) {
      await runSettlement({
        agentAccount: account,
        agentId,
        description: `Settle invoice ${s + 1} for ${profile.name}`,
        merchantId: "merchant-demo",
        merchantName: "Demo Merchant",
        payee: PAYEE,
        amount: SETTLE_AMOUNT,
        nonce: `${agentId}-${s}`,
        onTime: true,
        deployment: d,
      });
    }
    for (let f = 0; f < profile.failures; f++) {
      await waitTx(await ownerCall(owner, deployer, d.SettlementHook, SETTLEMENT_HOOK_ABI, "reportFailure", [BigInt(agentId), SETTLE_AMOUNT]));
    }
    for (let p = 0; p < profile.disputes; p++) {
      await waitTx(await ownerCall(owner, deployer, d.SettlementHook, SETTLEMENT_HOOK_ABI, "reportDispute", [BigInt(agentId), true]));
    }

    const score = await scoreOf(pub, d.ReputationOracle, agentId);
    const [limit, fee] = await terms(pub, d.CreditPolicy, score);
    console.log(
      `- ${profile.name} #${agentId} → score ${score} | limit ${formatUnits(limit, 6)} USDC | fee ${fee}bps`,
    );
  }

  await seedCreditPool(d, pub, owner, deployer, agents);
  console.log("\nDone. Run the dashboard to view live state.");

  function waitTx(hash: `0x${string}`) {
    return pub.waitForTransactionReceipt({ hash });
  }
}

// Seed the lending pool with LP liquidity and have the prime agent draw credit, so /credit shows activity.
async function seedCreditPool(d: any, pub: any, owner: any, deployer: Account, agents: SavedAgent[]) {
  if (!d.stablecoinIsMock) return;
  try {
    const cash = (await pub.readContract({ address: d.CreditLine, abi: CREDIT_LINE_ABI, functionName: "cash" })) as bigint;
    if (cash === 0n) {
      await pub.waitForTransactionReceipt({
        hash: await owner.writeContract({ address: d.Stablecoin, abi: MOCK_USDC_ABI, functionName: "mint", args: [deployer.address, USDC(200_000)], chain, account: deployer }),
      });
      await pub.waitForTransactionReceipt({
        hash: await owner.writeContract({ address: d.Stablecoin, abi: MOCK_USDC_ABI, functionName: "approve", args: [d.CreditLine, USDC(200_000)], chain, account: deployer }),
      });
      await pub.waitForTransactionReceipt({
        hash: await owner.writeContract({ address: d.CreditLine, abi: CREDIT_LINE_ABI, functionName: "deposit", args: [USDC(200_000)], chain, account: deployer }),
      });
      console.log("\nSeeded CreditLine pool with 200,000 USDC LP liquidity.");
    }
    const atlas = accountFromKey(agents[0]!.privateKey);
    const atlasId = Number(await pub.readContract({ address: d.AgentRegistry, abi: AGENT_REGISTRY_ABI, functionName: "agentIdOf", args: [atlas.address] }));
    const loan = (await pub.readContract({ address: d.CreditLine, abi: CREDIT_LINE_ABI, functionName: "loans", args: [BigInt(atlasId)] })) as any[];
    if (atlasId > 0 && (loan[0] as bigint) === 0n) {
      const wallet = makeWalletClient(chain, RPC_URL, atlas);
      await pub.waitForTransactionReceipt({
        hash: await wallet.writeContract({ address: d.CreditLine, abi: CREDIT_LINE_ABI, functionName: "borrow", args: [USDC(20_000)], chain, account: atlas }),
      });
      console.log("Atlas drew 20,000 USDC of under-collateralized credit.");
    }
  } catch (e) {
    console.warn(`[simulate] credit-pool seeding skipped: ${(e as Error).message}`);
  }
}

function ownerCall(owner: any, deployer: Account, address: `0x${string}`, abi: any, fn: string, args: any[]) {
  return owner.writeContract({ address, abi, functionName: fn, args, chain, account: deployer });
}
async function scoreOf(pub: any, oracle: `0x${string}`, agentId: number): Promise<number> {
  return Number(await pub.readContract({ address: oracle, abi: REPUTATION_ORACLE_ABI, functionName: "scoreOf", args: [BigInt(agentId)] }));
}
async function terms(pub: any, policy: `0x${string}`, score: number): Promise<[bigint, number]> {
  return (await pub.readContract({ address: policy, abi: CREDIT_POLICY_ABI, functionName: "terms", args: [BigInt(score)] })) as [bigint, number];
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
