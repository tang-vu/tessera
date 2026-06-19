/**
 * Server-side viem public client factory for Next.js API routes.
 * All chain reads go through server routes to avoid browser→RPC CORS issues.
 */
import { createPublicClient, http } from "viem";
import { chainById, type Deployment } from "@tessera/agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const CHAIN_ID = Number(process.env.CHAIN_ID ?? 31337);
export const RPC_URL =
  process.env.RPC_URL ??
  (CHAIN_ID === 31337 ? "http://127.0.0.1:8545" : chainById(CHAIN_ID).rpcUrls.default.http[0]!);

let _deployment: Deployment | null = null;

export function getDeployment(): Deployment {
  if (_deployment) return _deployment;
  // Resolve from repo root (web/ is one level below root)
  const path = join(process.cwd(), "..", "contracts", "deployments", `${CHAIN_ID}.json`);
  try {
    _deployment = JSON.parse(readFileSync(path, "utf8")) as Deployment;
    return _deployment;
  } catch {
    // Fallback: try relative from cwd directly (for different working dirs)
    const fallback = join(process.cwd(), "contracts", "deployments", `${CHAIN_ID}.json`);
    _deployment = JSON.parse(readFileSync(fallback, "utf8")) as Deployment;
    return _deployment;
  }
}

export function getPublicClient() {
  const chain = chainById(CHAIN_ID);
  return createPublicClient({ chain, transport: http(RPC_URL) });
}
