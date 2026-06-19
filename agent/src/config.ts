import "dotenv/config";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chainById } from "./chain";

const here = dirname(fileURLToPath(import.meta.url));

export const CHAIN_ID = Number(process.env.CHAIN_ID ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
export const chain = chainById(CHAIN_ID);
export const RPC_URL =
  process.env.RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? chain.rpcUrls.default.http[0]!;

export type Address = `0x${string}`;

export interface Deployment {
  chainId: number;
  AgentRegistry: Address;
  ReceiptVerifier: Address;
  ReputationOracle: Address;
  CreditPolicy: Address;
  SettlementHook: Address;
  CreditLine: Address;
  Stablecoin: Address;
  stablecoinIsMock: boolean;
}

/** Load deployed addresses written by contracts/script/Deploy.s.sol. */
export function loadDeployment(chainId: number = CHAIN_ID): Deployment {
  const path = join(here, "..", "..", "contracts", "deployments", `${chainId}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Deployment;
  } catch {
    throw new Error(
      `No deployment found at ${path}. Deploy first:\n` +
        `  cd contracts && forge script script/Deploy.s.sol --rpc-url <rpc> --broadcast`,
    );
  }
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
