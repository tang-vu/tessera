/**
 * Server-side viem public client factory for Next.js API routes.
 * All chain reads go through server routes to avoid browser→RPC CORS issues.
 */
import { createPublicClient, http } from "viem";
import { chainById, type Deployment } from "@tessera/agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// Bundled deployments so addresses resolve in serverless builds (Vercel) without filesystem access.
import d133 from "./deployments/133.json";
import d177 from "./deployments/177.json";

export const CHAIN_ID = Number(process.env.CHAIN_ID ?? 31337);
export const RPC_URL =
  process.env.RPC_URL ??
  (CHAIN_ID === 31337 ? "http://127.0.0.1:8545" : chainById(CHAIN_ID).rpcUrls.default.http[0]!);

const STATIC_DEPLOYMENTS: Record<number, Deployment> = {
  133: d133 as Deployment,
  177: d177 as Deployment,
};

/**
 * Block each deployment landed at (from the Foundry broadcast for that chain).
 * Used as the `fromBlock` for event-log scans so RPCs never scan from genesis —
 * the public HashKey RPC times out on a full-history `eth_getLogs`, but a scan
 * bounded to the deploy block returns in well under a second.
 */
const DEPLOY_BLOCKS: Record<number, bigint> = {
  133: 29_390_725n,
  177: 23_811_666n,
};

/** Lower bound for log scans on the active chain (0 for local anvil). */
export function getDeployBlock(): bigint {
  return DEPLOY_BLOCKS[CHAIN_ID] ?? 0n;
}

let _deployment: Deployment | null = null;

export function getDeployment(): Deployment {
  if (_deployment) return _deployment;
  // Hosted networks (testnet/mainnet) use the bundled JSON — works in any runtime.
  const bundled = STATIC_DEPLOYMENTS[CHAIN_ID];
  if (bundled) {
    _deployment = bundled;
    return _deployment;
  }
  // Local dev (e.g. anvil 31337): read the freshly-written deployment from the repo.
  const path = join(process.cwd(), "..", "contracts", "deployments", `${CHAIN_ID}.json`);
  _deployment = JSON.parse(readFileSync(path, "utf8")) as Deployment;
  return _deployment;
}

export function getPublicClient() {
  const chain = chainById(CHAIN_ID);
  return createPublicClient({ chain, transport: http(RPC_URL) });
}
