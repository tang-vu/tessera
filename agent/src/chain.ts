import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Account,
  type Chain,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

/** HashKey Chain mainnet (OP-Stack L2, gas token HSK). */
export const hashkeyMainnet = defineChain({
  id: 177,
  name: "HashKey Chain",
  nativeCurrency: { name: "HashKey", symbol: "HSK", decimals: 18 },
  rpcUrls: { default: { http: ["https://mainnet.hsk.xyz"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://hashkey.blockscout.com" } },
});

/** HashKey Chain testnet. */
export const hashkeyTestnet = defineChain({
  id: 133,
  name: "HashKey Chain Testnet",
  nativeCurrency: { name: "HashKey", symbol: "HSK", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.hsk.xyz"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://testnet-explorer.hsk.xyz" } },
  testnet: true,
});

/** Local anvil for development. */
export const anvilLocal = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

export function chainById(id: number): Chain {
  if (id === 177) return hashkeyMainnet;
  if (id === 133) return hashkeyTestnet;
  return anvilLocal;
}

export function makePublicClient(chain: Chain, rpcUrl: string): PublicClient {
  return createPublicClient({ chain, transport: http(rpcUrl) });
}

export function makeWalletClient(chain: Chain, rpcUrl: string, account: Account): WalletClient {
  return createWalletClient({ chain, account, transport: http(rpcUrl) });
}

export function accountFromKey(privateKey: string): Account {
  const pk = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`;
  return privateKeyToAccount(pk);
}
