import { describe, it, expect } from "vitest";
import {
  formatUsdc,
  shortAddress,
  shortHash,
  tierFromScore,
  formatFeeBps,
  agentNameFromUri,
} from "@/lib/format-helpers";

describe("formatUsdc", () => {
  it("formats whole amounts with thousands separators", () => {
    expect(formatUsdc(1_000_000n)).toBe("1 USDC");
    expect(formatUsdc(50_000_000_000n)).toBe("50,000 USDC");
    expect(formatUsdc(0n)).toBe("0 USDC");
  });
  it("formats fractional amounts and trims trailing zeros", () => {
    expect(formatUsdc(1_500_000n)).toBe("1.5 USDC");
    expect(formatUsdc(1_234_500n)).toBe("1.2345 USDC");
  });
  it("accepts string/number inputs", () => {
    expect(formatUsdc("2000000")).toBe("2 USDC");
    expect(formatUsdc(3_000_000)).toBe("3 USDC");
  });
});

describe("shortAddress / shortHash", () => {
  it("shortens an address", () => {
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
  });
  it("returns short input unchanged", () => {
    expect(shortAddress("0x12")).toBe("0x12");
  });
  it("shortens a bytes32 hash", () => {
    expect(shortHash("0x" + "a".repeat(64))).toBe("0xaaaaaaaa…aaaaaa");
  });
});

describe("tierFromScore", () => {
  it("maps boundaries to the right tier", () => {
    expect(tierFromScore(0)).toBe("Untrusted");
    expect(tierFromScore(199)).toBe("Untrusted");
    expect(tierFromScore(200)).toBe("Emerging");
    expect(tierFromScore(499)).toBe("Emerging");
    expect(tierFromScore(500)).toBe("Established");
    expect(tierFromScore(799)).toBe("Established");
    expect(tierFromScore(800)).toBe("Prime");
    expect(tierFromScore(1000)).toBe("Prime");
  });
});

describe("formatFeeBps", () => {
  it("converts basis points to a percentage", () => {
    expect(formatFeeBps(20)).toBe("0.20%");
    expect(formatFeeBps(45)).toBe("0.45%");
    expect(formatFeeBps(100)).toBe("1.00%");
    expect(formatFeeBps(250)).toBe("2.50%");
  });
});

describe("agentNameFromUri", () => {
  it("title-cases a kebab slug", () => {
    expect(agentNameFromUri("ipfs://tessera/atlas", 1)).toBe("Atlas");
    expect(agentNameFromUri("https://x.io/credit-line", 2)).toBe("Credit Line");
  });
  it("falls back to Agent #id for missing or address-like uris", () => {
    expect(agentNameFromUri(undefined, 7)).toBe("Agent #7");
    expect(agentNameFromUri("ipfs://x/0xabc123", 9)).toBe("Agent #9");
  });
});
