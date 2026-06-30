/**
 * Mirror of the on-chain ReputationOracle scoring model, for the transparency
 * page and tests. Constants MUST match contracts/src/ReputationOracle.sol —
 * the score itself is computed on-chain; this is a faithful, auditable copy
 * used only for explanation and client-side worked examples.
 */

export const BASELINE = 500;
export const MAX_SCORE = 1000;

// Reward / penalty points (see ReputationOracle.sol)
export const REWARD_RECEIPTED = 25; // success + verified receipt
export const REWARD_NO_RECEIPT = 2; // success, no receipt
export const REPAY_REWARD = 10; // honored credit obligation (secondary signal)
export const ONTIME_BONUS = 5;
export const LATE_PENALTY = 10;
export const FAIL_PENALTY = 40;
export const DISPUTE_PENALTY = 80;
export const DISPUTE_CLEARED_REWARD = 3;
export const DEFAULT_PENALTY = 150;

// +1 point per 100 USDC settled, capped at +10
export const VOLUME_BONUS_UNIT_USDC = 100;
export const VOLUME_BONUS_MAX = 10;

// Mild linear decay toward BASELINE so a score reflects recent behavior
export const DECAY_PER_DAY = 1;

export interface ScoreFactor {
  label: string;
  points: string;
  detail: string;
}

/** Score-increasing factors, for display. */
export const REWARDS: ScoreFactor[] = [
  { label: "Receipted settlement", points: `+${REWARD_RECEIPTED}`, detail: "Successful payment with a verified reasoning receipt — the core signal." },
  { label: "On-time", points: `+${ONTIME_BONUS}`, detail: "Settlement or repayment completed before its deadline." },
  { label: "Volume bonus", points: `+1 … +${VOLUME_BONUS_MAX}`, detail: `+1 per ${VOLUME_BONUS_UNIT_USDC} USDC settled, capped at +${VOLUME_BONUS_MAX}.` },
  { label: "Credit repaid", points: `+${REPAY_REWARD}`, detail: "Honored an under-collateralized loan (secondary to receipts)." },
  { label: "Settlement, no receipt", points: `+${REWARD_NO_RECEIPT}`, detail: "Success without a receipt earns only a token reward." },
  { label: "Dispute cleared", points: `+${DISPUTE_CLEARED_REWARD}`, detail: "A dispute resolved in the agent's favor." },
];

/** Score-decreasing factors, for display. */
export const PENALTIES: ScoreFactor[] = [
  { label: "Credit default", points: `−${DEFAULT_PENALTY}`, detail: "Failed to repay a loan — the harshest penalty." },
  { label: "Dispute lost", points: `−${DISPUTE_PENALTY}`, detail: "A dispute resolved against the agent." },
  { label: "Failed settlement", points: `−${FAIL_PENALTY}`, detail: "A payment that did not complete." },
  { label: "Late", points: `−${LATE_PENALTY}`, detail: "Missed the deadline (replaces the on-time bonus)." },
];

/** Volume bonus in points for a settled USDC amount (mirrors _volumeBonus). */
export function volumeBonus(amountUsdc: number): number {
  return Math.min(Math.floor(amountUsdc / VOLUME_BONUS_UNIT_USDC), VOLUME_BONUS_MAX);
}

/**
 * Delta applied by a single settlement — mirrors recordSettlement() in the
 * ReputationOracle. `amountUsdc` is a whole-USDC amount.
 */
export function settlementDelta(opts: {
  success: boolean;
  hasReceipt: boolean;
  onTime: boolean;
  amountUsdc: number;
}): number {
  if (!opts.success) return -FAIL_PENALTY;
  const base = opts.hasReceipt ? REWARD_RECEIPTED : REWARD_NO_RECEIPT;
  const timing = opts.onTime ? ONTIME_BONUS : -LATE_PENALTY;
  return base + volumeBonus(opts.amountUsdc) + timing;
}

/** Clamp a raw score into the valid [0, MAX_SCORE] band. */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(MAX_SCORE, score));
}
