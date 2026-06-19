import { keccak256, stringToHex } from "viem";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Off-chain reasoning-trace storage. The full trace lives off-chain (Irys/IPFS) and only its
// keccak256 hash is anchored on-chain. Irys is used when IRYS_PRIVATE_KEY is configured; otherwise
// a local file fallback keeps the demo fully runnable while still producing the real verifiable hash.

export type StorageBackend = "irys" | "local";

export interface StoredReceipt {
  uri: string;
  receiptHash: `0x${string}`;
  backend: StorageBackend;
}

/** Deterministic canonical serialization used for hashing. */
export function canonicalize(trace: unknown): string {
  return JSON.stringify(trace);
}

/** keccak256 of the canonical trace — this is the value anchored on-chain. */
export function hashTrace(trace: unknown): `0x${string}` {
  return keccak256(stringToHex(canonicalize(trace)));
}

export async function storeTrace(trace: unknown, receiptHash: `0x${string}`): Promise<StoredReceipt> {
  if (process.env.IRYS_PRIVATE_KEY) {
    try {
      const uri = await uploadToIrys(canonicalize(trace));
      return { uri, receiptHash, backend: "irys" };
    } catch (e) {
      console.warn(`[storage] Irys upload failed, using local fallback: ${(e as Error).message}`);
    }
  }
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", ".receipts");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${receiptHash}.json`);
  writeFileSync(file, JSON.stringify({ receiptHash, trace }, null, 2));
  return { uri: `file://${file}`, receiptHash, backend: "local" };
}

/** Upload to Irys (permanent storage). Requires the optional @irys/* packages + a funded key. */
async function uploadToIrys(data: string): Promise<string> {
  // Dynamic import so the package is optional — the demo runs without it.
  const { Uploader } = await import("@irys/upload");
  const { Ethereum } = await import("@irys/upload-ethereum");
  const irys = await Uploader(Ethereum).withWallet(process.env.IRYS_PRIVATE_KEY!);
  const receipt = await irys.upload(data, {
    tags: [
      { name: "Content-Type", value: "application/json" },
      { name: "App", value: "Tessera" },
    ],
  });
  return `https://gateway.irys.xyz/${receipt.id}`;
}
