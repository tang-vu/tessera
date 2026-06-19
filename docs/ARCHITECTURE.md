# Tessera — Architecture & Distilled Facts

> On-chain **credit bureau for AI agents** on HashKey Chain. Every HSP settlement must carry a
> verifiable *reasoning receipt*; Tessera scores on-chain behavior into a 0–1000 credit rating that
> unlocks higher credit limits and lower fees. Honest agents get cheaper capital; dishonest ones get cut off.

---

## 1. HashKey Chain — verified network facts

HashKey Chain is an Ethereum L2 on the **OP-Stack**, fully EVM-compatible. Standard Solidity tooling
(Foundry/Hardhat) works against the HashKey RPC. Sources: `docs.hashkeychain.net` (Network-Info,
Token-Contracts, Tools/Faucet, Contract-Addresses).

| | Mainnet | Testnet |
|---|---|---|
| Chain ID | `177` | `133` |
| RPC | `https://mainnet.hsk.xyz` | `https://testnet.hsk.xyz` |
| Explorer (Blockscout) | `https://hashkey.blockscout.com` | `https://testnet-explorer.hsk.xyz` |
| Gas token | `HSK` | `HSK` (faucet) |
| Faucet | — | `https://faucet.hsk.xyz/faucet` (≈1 HSK / 24h) |

**Official mainnet stablecoins** (use on mainnet; testnet not published → deploy `MockUSDC` on testnet):

| Token | Mainnet address |
|---|---|
| USDC | `0x054ed45810DbBAb8B27668922D110669c9D88D0a` |
| USDT | `0xf1b50ed67a9e2cc94ad3c477779e2d4cbfff9029` |
| WHSK | `0xB210D2120d57b758EE163cFfb43e73728c471Cf1` |

- **EVM version:** target `cancun` (HashKey is OP-Stack post-Ecotone → full Cancun EVM: PUSH0, MCOPY, transient storage; matches solc 0.8.24 default).
- **Verification:** Blockscout API (`<explorer>/api`), no API key required — pass any non-empty string to `forge verify-contract`.
- **OP-Stack predeploys** (both networks): L2StandardBridge `0x4200…0010`, L2CrossDomainMessenger `0x4200…0007`.

---

## 2. AP2 mandates (modeled off-chain in TypeScript)

AP2 (Agent Payments Protocol, Google) defines three chained mandates as signed credentials
(ECDSA P-256 / SHA-256, W3C VC form). Tessera models the **data shapes** only; we do not run AP2
infrastructure. Chain: **Intent → Cart/Checkout → Payment**, each binding the prior by hash.

- **IntentMandate** — user authorizes an agent to transact within constraints
  (`natural_language_description`, `merchants[]`, `skus[]`, `intent_expiry`, `user_cart_confirmation_required`).
- **CartMandate / CheckoutMandate** — locks exact items + price; binds via `checkout_hash` (merchant-signed `checkout_jwt`).
- **PaymentMandate** — minimal network-facing authorization; `transaction_id = hash(checkout_jwt)`, `payment_amount {amount,currency}`, `payment_instrument`.

The agent builds these as typed objects (`agent/src/mandate.ts`), derives a deterministic
`settlementId` from the mandate chain, and that ties the off-chain payment intent to the on-chain receipt + settlement.

---

## 3. HSP (HashKey Settlement Protocol) — integration & swap point

HSP is a **compliance-first settlement layer built on AP2**: off-chain mandate validation + AML/sanctions
checks by licensed verification nodes, then an **atomic on-chain stablecoin transfer** on HashKey Chain.
**No public Solidity ABI / SDK is published** (confirmed via recon — only press + conceptual flow). For the
hackathon you do **not** onboard as a licensed institution.

**Therefore:** we model the AP2 mandate flow off-chain and implement a **mock `SettlementHook`** that performs
the stablecoin transfer on testnet. The exact swap point is one call in `SettlementHook.settle(...)`:

```
// MOCK (testnet/demo): pull stablecoin from agent → payee directly
stablecoin.transferFrom(agentController, payee, amount);
// ── SWAP POINT ──> on mainnet, replace the line above with the real HSP settlement call:
//    IHSPSettlement(HSP).settle(settlementId, stablecoin, agentController, payee, amount, mandateHash);
// HSP then runs AML/compliance off-chain and executes the on-chain transfer atomically.
```

Everything else (receipt anchoring, reputation scoring, credit policy) is unchanged by the swap — Tessera
sits *above* settlement, consuming its success/failure signal.

---

## 4. System flow

```
AI Agent (off-chain, TS)
  1. builds AP2 mandate chain (Intent→Cart→Payment) → derives settlementId
  2. Gemini produces a structured reasoning trace for the payment decision
  3. full trace stored on IPFS/Irys → receiptHash = keccak256(canonical trace)
  4. agent controller signs receiptHash (ECDSA)
        │
        ▼
ReceiptVerifier.anchorReceipt(agentId, settlementId, receiptHash, sig)   // verifies controller sig
        │
        ▼
SettlementHook.settle(agentId, payee, amount, settlementId)             // requires anchored receipt
        │  (mock stablecoin transfer; HSP swap point above)
        ▼
ReputationOracle.recordSettlement(agentId, amount, success, onTime, hasVerifiedReceipt)
        │  maintains transparent 0–1000 score
        ▼
CreditPolicy.terms(score) → (creditLimit, feeBps)                        // pure tier mapping
        ▼
CreditLine.borrow/repay (DeFi crossover)                                 // under-collateralized, reputation-backed
        ▼
Next.js dashboard: directory · score-over-time · receipts · live "settle → score → terms" demo
```

---

## 5. Reputation scoring (transparent, auditable)

Score ∈ `[0,1000]`, starts at a neutral baseline. `ReputationOracle` is the single source of truth; only
authorized recorders (`SettlementHook`, `CreditLine`) may mutate it. Design goals: **monotone in good
behavior, punishing of fraud/default, and fully on-chain readable** (security judges will read this).

Signals per settlement (`recordSettlement`):
- `success && hasVerifiedReceipt` → reward (larger reward for larger, on-time settlements; capped).
- `success && !hasVerifiedReceipt` → small/no reward (receipts are the whole point).
- `!success` → penalty.
- `!onTime` → reduced reward / mild penalty.

Disputes (`recordDispute(agentId, resolvedAgainst)`): if resolved against the agent → significant penalty.
Defaults (from `CreditLine`) → large penalty (slash).

Mild **time decay** keeps scores honest (stale good behavior counts less). Exact constants live in
`ReputationOracle.sol` with NatSpec; tiers below are owner-configurable in `CreditPolicy`.

### Credit tiers (default; owner-configurable)

| Score | Tier | Credit limit | Fee (bps) |
|---|---|---|---|
| `< 200` | Untrusted | 0 | 100 (1.00%) |
| `200–499` | Emerging | moderate | 70 (0.70%) |
| `500–799` | Established | higher | 45 (0.45%) |
| `≥ 800` | Prime | top | 20 (0.20%) |

This is the literal implementation of *"honest agents get higher limits + lower fees."*

---

## 6. White Paper 2.0 alignment

HashKey WP2.0 frames the AI-agent roadmap as **identity + credit + assets** (ZKID + a credit/reputation
mechanism + HSP). The *identity (ZK)* piece was saturated by prior hackathon winners; the **credit/reputation**
piece is the open gap. Tessera fills it, **uses HSP** (DeFi-track bonus), and turns reputation into a real
**under-collateralized lending** primitive (the DeFi×AI crossover). Demo north star: settlement → score moves
→ terms (limit + fee) visibly improve.

---

## 7. Open questions (non-blocking)

- HSP has no public contract ABI/SDK — swap point is documented but unverifiable until HashKey publishes it.
- Testnet stablecoin addresses unpublished → `MockUSDC` on testnet is the correct call.
- Faucet rate (~1 HSK/24h) may throttle seeding many agents — seed sequentially / request bulk from HashKey if needed.
