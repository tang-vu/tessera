# Tessera — Demo Storyboard (< 2 min judge video)

> Goal: make the thesis visceral — **trigger a settlement → score moves → the agent's terms (limit + fee) visibly improve.** Honest agents get cheaper capital; dishonest ones get cut off.

## Pre-record setup (off camera)

Deploy + seed against HashKey **testnet** (same code path as mainnet) or local anvil:

```bash
# 1. build + deploy
cd contracts && forge build
forge script script/Deploy.s.sol --rpc-url $HSK_TESTNET_RPC --broadcast   # writes deployments/133.json
cd ..
# 2. seed 5 agents across all tiers + LP liquidity + a credit draw
CHAIN_ID=133 pnpm agent:simulate
# 3. run the dashboard
NEXT_PUBLIC_CHAIN_ID=133 pnpm web:dev      # http://localhost:3000
```

Have the block explorer (`https://testnet-explorer.hsk.xyz`) open in a second tab to prove on-chain state.

---

## Shot list

**0:00–0:12 — Hook (title + problem).**
On-screen: "Tessera — an on-chain credit bureau for AI agents on HashKey Chain."
Say: *"Autonomous AI agents are about to move money on HashKey via HSP. HashKey's own White Paper 2.0 says agents need three things: identity, credit, and assets. Identity — the ZK piece — is solved. **Credit is the open gap.** Tessera fills it."*

**0:12–0:32 — The directory (`/`).**
Show the 5 seeded agents. Point out the spread:
- Atlas — score **900**, Prime → **$50k** limit @ **0.20%**.
- Ember — score **140**, Untrusted → **$0** limit @ **1.00%**.
Say: *"Same primitive, opposite outcomes. Your on-chain behavior is your credit. Honest agents unlock higher limits and lower fees."*

**0:32–0:46 — Agent detail (`/agent/1`, Atlas).**
Show the score-over-time chart climbing and the receipts list.
Say: *"Every settlement Atlas made carries a signed **reasoning receipt** — an LLM trace of why it paid, stored off-chain, hashed and anchored on-chain. No receipt, no credit. This is the audit trail underwriting the score."*

**0:46–1:12 — The live loop (`/demo`).**
Pick Beacon (mid-tier, ~700). Click **"Run a settlement."** Narrate as it happens:
*"The agent forms an AP2 mandate, Gemini produces the reasoning receipt, the hash is signed and anchored, then the mock HSP settlement executes and the ReputationOracle records it."*
The score jumps (+40) and the **credit terms update live** (limit ↑, fee ↓). Show the rendered receipt (decision, steps, risk). Click again: *"Each honest settlement compounds — watch it climb toward Prime."*

**1:12–1:26 — The payoff (`/credit`).**
Show the lending pool: LPs deposited liquidity; Atlas borrowed **$20k with zero collateral**, priced at its Prime fee.
Say: *"This is the DeFi×AI crossover. Reputation **is** the collateral. Under-collateralized credit, priced by behavior. Default, and the score is slashed and credit cut off."*

**1:26–1:30 — Close.**
Say: *"Tessera turns agent reputation into real capital — built on HSP, filling the credit gap in HashKey's AI-agent roadmap, deployed on HashKey mainnet."*
Cut to the block explorer showing the deployed contracts.

---

## One-liners to keep ready
- "Honest agents get cheaper capital. Dishonest ones get cut off."
- "A FICO score for autonomous agents, enforced on-chain."
- "We don't replace HSP — we sit on top of it and turn its settlement signal into credit."

## Fallbacks if something fails live
- If a tx is slow: cut to the pre-seeded directory; the loop is already proven by the seeded score history.
- If RPC is flaky: the `/demo` settlement is server-driven and idempotent — just click again.
