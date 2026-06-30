import { describe, it, expect } from "vitest";
import {
  BASELINE,
  MAX_SCORE,
  settlementDelta,
  volumeBonus,
  clampScore,
} from "@/lib/scoring-model";

describe("volumeBonus", () => {
  it("awards +1 per 100 USDC and caps at +10", () => {
    expect(volumeBonus(50)).toBe(0);
    expect(volumeBonus(100)).toBe(1);
    expect(volumeBonus(999)).toBe(9);
    expect(volumeBonus(1000)).toBe(10);
    expect(volumeBonus(50_000)).toBe(10); // capped
  });
});

describe("settlementDelta", () => {
  it("matches the Atlas worked example: receipted + on-time + 1k volume = +40", () => {
    expect(settlementDelta({ success: true, hasReceipt: true, onTime: true, amountUsdc: 1000 })).toBe(40);
  });
  it("rewards far less without a receipt", () => {
    expect(settlementDelta({ success: true, hasReceipt: false, onTime: true, amountUsdc: 1000 })).toBe(17);
  });
  it("applies the late penalty instead of the on-time bonus", () => {
    expect(settlementDelta({ success: true, hasReceipt: true, onTime: false, amountUsdc: 1000 })).toBe(25);
  });
  it("penalizes a failed settlement", () => {
    expect(settlementDelta({ success: false, hasReceipt: true, onTime: true, amountUsdc: 1000 })).toBe(-40);
  });
});

describe("clampScore", () => {
  it("clamps into [0, MAX_SCORE]", () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(MAX_SCORE + 500)).toBe(MAX_SCORE);
    expect(clampScore(900)).toBe(900);
  });
});

describe("worked example end-to-end", () => {
  it("reaches 900 after 10 receipted, on-time, 1k settlements from baseline", () => {
    const perSettle = settlementDelta({ success: true, hasReceipt: true, onTime: true, amountUsdc: 1000 });
    expect(clampScore(BASELINE + perSettle * 10)).toBe(900);
  });
});
