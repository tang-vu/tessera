# Tessera — Build Plan

On-chain **credit bureau for AI agents** on HashKey Chain. Settlements require verifiable reasoning
receipts → behavior is scored 0–1000 → score unlocks higher credit limits + lower fees → reputation
becomes an under-collateralized lending primitive. Full facts: `docs/ARCHITECTURE.md`.

**North-star demo:** trigger a settlement → reasoning receipt anchored → score updates on-chain →
credit terms (limit + fee) visibly improve in the UI.

## Phases

| Phase | Scope | Status |
|---|---|---|
| P0 | Scaffold: pnpm workspace, Foundry, Next.js, `.env.example` | ✅ done |
| P1 | Core contracts + full Foundry tests (50 passing) + deploy script | ✅ done |
| P2 | Agent service: mandates, reasoning receipts, settle, simulate | ✅ done (validated on anvil) |
| P3 | Dashboard: directory, agent detail (score chart + receipts + terms), live `/demo` | ✅ done (validated on anvil) |
| P4 | CreditLine (DeFi crossover) + `/credit` UI | ✅ done (contract tested + UI) |
| P5 | Polish: DEMO.md storyboard, README, mainnet deploy ready | ✅ done |

**Verified end-to-end on anvil:** dashboard reads live state; `POST /api/demo/settle` runs the full
loop (Beacon 700→740, receipt anchored, terms read live). Contracts hardened after security review (52
tests pass). **Only remaining step is the live testnet/mainnet deploy** — needs a funded burner key
(`.env` → `DEPLOYER_PRIVATE_KEY` + faucet HSK); one command per `README.md`.

The demo loop (P1–P3) is sacred. P4/EAS are stretch — a flawless P1–P3 beats a half-broken P4.

## Contract interfaces (P1)

- **MockUSDC** — mintable 6-decimal ERC20, testnet only. Mainnet swaps to official USDC.
- **AgentRegistry** — `register(controller, metadataURI) → agentId`; `controllerOf`, `metadataURI`, `exists`. Emits `AgentRegistered`.
- **ReceiptVerifier** — `anchorReceipt(agentId, settlementId, receiptHash, sig)` verifies controller ECDSA sig over `receiptHash`; stores; `verifiedReceipt(agentId, settlementId) → bool`. Emits `ReceiptAnchored`.
- **ReputationOracle** — `scoreOf(agentId) ∈ [0,1000]`; `recordSettlement(agentId, amount, success, onTime, hasVerifiedReceipt)` and `recordDispute(agentId, resolvedAgainst)` — only authorized recorders. Transparent scoring + mild decay. Emits `ScoreUpdated`.
- **CreditPolicy** (pure/view) — `terms(score) → (creditLimit, feeBps)` via owner-set tiers. Defaults: <200→(0,100); 200–499→(mod,70); 500–799→(high,45); ≥800→(top,20).
- **SettlementHook** — `settle(agentId, payee, amount, settlementId)`: require verified receipt → mock stablecoin transfer (HSP swap point) → `recordSettlement`. Emits `Settled`.
- **CreditLine** (P4) — reputation-backed pool: `deposit/withdraw` (LP), `borrow(amount)` ≤ `terms(score).creditLimit`, `repay()` with `feeBps` fee, `markDefault()` past deadline → slash score.

## Build order & deps

MockUSDC, AgentRegistry (no deps) → ReceiptVerifier (Registry) → ReputationOracle (recorders) →
CreditPolicy (Ownable) → SettlementHook (Verifier+Oracle+token) → CreditLine (Policy+Oracle+Registry+token).
Deploy.s.sol wires authorizations and writes `deployments/<network>.json`.

## Conventions

Solidity `^0.8.24`, evm `shanghai`, OZ v5.1.0, NatSpec on every public fn, `forge test` + `forge snapshot`
after each contract. No secrets committed. Build/test on testnet; mainnet deploy is the final user-run step.

## Open questions (non-blocking, resolved by defaults)

- HSP has no public ABI → mock settlement + documented swap point. (decided)
- Testnet stablecoins unpublished → MockUSDC on testnet. (decided)
- Receipt storage: Irys vs IPFS pinning → support both via env; default to whichever key is present. (P2)
