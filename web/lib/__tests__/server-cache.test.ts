import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cached } from "@/lib/server-cache";

describe("cached", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the computed value and serves it from cache within the TTL", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      return calls;
    };

    expect(await cached("k1", 5000, fn)).toBe(1);
    vi.setSystemTime(4999);
    expect(await cached("k1", 5000, fn)).toBe(1); // cache hit — fn not re-run
    expect(calls).toBe(1);
  });

  it("recomputes after the TTL expires", async () => {
    let calls = 0;
    const fn = async () => ++calls;

    expect(await cached("k2", 5000, fn)).toBe(1);
    vi.setSystemTime(5001);
    expect(await cached("k2", 5000, fn)).toBe(2); // expired — fn runs again
    expect(calls).toBe(2);
  });

  it("keys are independent", async () => {
    const a = await cached("ka", 1000, async () => "a");
    const b = await cached("kb", 1000, async () => "b");
    expect(a).toBe("a");
    expect(b).toBe("b");
  });
});
