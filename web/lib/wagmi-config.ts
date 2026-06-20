/**
 * Wagmi v2 client-side configuration for Tessera wallet connectivity.
 *
 * Chain definitions are inlined here (not imported from @tessera/agent) to
 * prevent agent's Node-only dependencies (fs, @irys/upload, inquirer…) from
 * leaking into the browser bundle via the providers tree.
 *
 * Supports: HashKey Chain mainnet (177), testnet (133), Anvil local (31337).
 * Default chain determined by NEXT_PUBLIC_CHAIN_ID (defaults to 31337).
 */
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

// ── Inline chain definitions (mirrors agent/src/chain.ts, no Node deps) ──────

const hashkeyMainnet = defineChain({
  id: 177,
  name: "HashKey Chain",
  nativeCurrency: { name: "HashKey", symbol: "HSK", decimals: 18 },
  rpcUrls: { default: { http: ["https://mainnet.hsk.xyz"] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://hashkey.blockscout.com" },
  },
});

const hashkeyTestnet = defineChain({
  id: 133,
  name: "HashKey Chain Testnet",
  nativeCurrency: { name: "HashKey", symbol: "HSK", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.hsk.xyz"] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://testnet-explorer.hsk.xyz" },
  },
  testnet: true,
});

const anvilLocal = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

// ── RPC resolution (browser-safe: no process.env access at module init) ───────

const NEXT_PUBLIC_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337
);
const NEXT_PUBLIC_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

function rpcForChain(id: number): string {
  if (NEXT_PUBLIC_RPC_URL && id === NEXT_PUBLIC_CHAIN_ID) return NEXT_PUBLIC_RPC_URL;
  if (id === 177) return "https://mainnet.hsk.xyz";
  if (id === 133) return "https://testnet.hsk.xyz";
  return "http://127.0.0.1:8545";
}

// ── Config ───────────────────────────────────────────────────────────────────

export const wagmiConfig = createConfig({
  chains: [anvilLocal, hashkeyTestnet, hashkeyMainnet],
  connectors: [injected()],
  transports: {
    [anvilLocal.id]: http(rpcForChain(31337)),
    [hashkeyTestnet.id]: http(rpcForChain(133)),
    [hashkeyMainnet.id]: http(rpcForChain(177)),
  },
  ssr: true,
});
