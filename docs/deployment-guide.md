# Tessera — Deployment Guide

Deploy the Tessera contracts to HashKey Chain. Build/test locally first; the live deploy is the final
step and needs a **funded burner key**. A one-command helper wraps the whole flow:

```powershell
powershell -File scripts/deploy-hashkey.ps1                  # testnet: deploy + seed demo agents
powershell -File scripts/deploy-hashkey.ps1 -Network mainnet # mainnet: deploy only (official USDC)
```

The helper loads `.env`, checks the deployer balance, deploys, verifies on Blockscout (best-effort),
and (on testnet) seeds 5 demo agents. Below is what it does, step by step, if you prefer to run manually.

---

## 0. Prerequisites

- `pnpm install` done at the repo root.
- Foundry installed (`forge`, `cast` on PATH). On Windows the binaries live in `%USERPROFILE%\.foundry\bin`.
- A **fresh burner** private key (never a personal wallet).
- `cp .env.example .env` and fill in `DEPLOYER_PRIVATE_KEY`. `.env` is gitignored — never commit it.

## 1. Pre-flight (local)

```bash
cd contracts && forge test        # 52 tests should pass
```

## 2. Get gas (testnet)

- Faucet: https://faucet.hsk.xyz/faucet  → request testnet HSK to your burner address (≈1 HSK / 24h).
- You need enough to deploy (~0.02 HSK) plus a little to seed agents (the seeder funds each agent ~0.05 HSK).
- Check balance: `cast balance <addr> --rpc-url https://testnet.hsk.xyz`

## 3. Deploy — Testnet (chainId 133)

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url https://testnet.hsk.xyz --broadcast \
  --verify --verifier blockscout --verifier-url https://testnet-explorer.hsk.xyz/api
```

- Deploys `AgentRegistry`, `ReceiptVerifier`, `ReputationOracle`, `CreditPolicy`, `SettlementHook`,
  `CreditLine`, and a **MockUSDC** (testnet stablecoin).
- Writes addresses to `contracts/deployments/133.json` (read automatically by the agent + dashboard).

## 4. Seed + run (testnet)

```bash
CHAIN_ID=133 pnpm agent:simulate                                  # 5 agents across all tiers + a credit draw
NEXT_PUBLIC_CHAIN_ID=133 NEXT_PUBLIC_RPC_URL=https://testnet.hsk.xyz pnpm web:dev
```

Open http://localhost:3000 — the directory, agent pages, `/demo`, and `/credit` now read live testnet state.

## 5. Deploy — Mainnet (chainId 177) — eligibility step

Fund the burner with a few dollars of **mainnet HSK**, then:

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url https://mainnet.hsk.xyz --broadcast \
  --verify --verifier blockscout --verifier-url https://hashkey.blockscout.com/api
```

- On chainId 177 the script **auto-wires the official HashKey USDC** (`0x054ed45810DbBAb8B27668922D110669c9D88D0a`)
  instead of MockUSDC. No `MockUSDC` is deployed.
- Addresses land in `contracts/deployments/177.json`.
- The interactive demo is best shown on **testnet** (MockUSDC faucet). The mainnet deploy satisfies the
  hackathon "contracts deployed on HashKey Chain mainnet" requirement; do not run `simulate` on mainnet
  (it expects a faucet-mintable stablecoin).

## 6. Verify contracts (if the `--verify` step failed)

Blockscout verification can be flaky during the broadcast. Re-run verification without re-deploying:

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url <rpc> --resume \
  --verify --verifier blockscout --verifier-url <explorer>/api
```

Or verify a single contract: `forge verify-contract <address> <Contract> --verifier blockscout --verifier-url <explorer>/api`.

## Network reference

| | Testnet | Mainnet |
|---|---|---|
| Chain ID | 133 | 177 |
| RPC | https://testnet.hsk.xyz | https://mainnet.hsk.xyz |
| Explorer | https://testnet-explorer.hsk.xyz | https://hashkey.blockscout.com |
| Stablecoin | MockUSDC (deployed) | Official USDC `0x054ed4…D88D0a` |
| Faucet | https://faucet.hsk.xyz/faucet | — |

## Troubleshooting

- **`DEPLOYER_PRIVATE_KEY missing/zero`** — fill `.env` with a real funded burner key.
- **0 balance / `insufficient funds`** — fund via the faucet (testnet) or bridge HSK (mainnet); confirm with `cast balance`.
- **Verification fails but deploy succeeded** — check `deployments/<chainId>.json`; re-run with `--resume --verify` (step 6).
- **`simulate` fails on mainnet** — expected; it needs a mintable testnet stablecoin. Use testnet for the live demo.
- **Faucet rate limit (~1 HSK/24h)** — request early; the seeder funds 5 agents, so budget gas or reduce agent count.
- **RPC timeouts** — retry; HashKey public RPC can be rate-limited under load.
