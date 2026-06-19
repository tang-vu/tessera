/**
 * Display formatting utilities: USDC amounts, addresses, tier labels, score formatting.
 */

/** Convert USDC base units (6 decimals) to human-readable string. */
export function formatUsdc(baseUnits: bigint | string | number): string {
  const n = typeof baseUnits === "bigint" ? baseUnits : BigInt(String(baseUnits));
  const whole = n / 1_000_000n;
  const frac = n % 1_000_000n;
  if (frac === 0n) return `${whole.toLocaleString()} USDC`;
  const fracStr = frac.toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole.toLocaleString()}.${fracStr} USDC`;
}

/** Shorten a 0x address to 0x1234…abcd. */
export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Shorten a bytes32 hash (0x + 64 chars) to 0x1234…abcd. */
export function shortHash(hash: string): string {
  if (!hash || hash.length < 10) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export type Tier = "Untrusted" | "Emerging" | "Established" | "Prime";

export function tierFromScore(score: number): Tier {
  if (score >= 800) return "Prime";
  if (score >= 500) return "Established";
  if (score >= 200) return "Emerging";
  return "Untrusted";
}

/** Tailwind class name tokens for each tier. */
export const TIER_STYLES: Record<Tier, { text: string; bg: string; border: string; dot: string }> = {
  Untrusted: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    dot: "bg-red-400",
  },
  Emerging: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
  },
  Established: {
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
  },
  Prime: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },
};

/** Fee in basis points → display string, e.g. 250 → "2.50%" */
export function formatFeeBps(feeBps: number): string {
  return `${(feeBps / 100).toFixed(2)}%`;
}

/** Unix timestamp → local date string. */
export function formatTimestamp(ts: number | bigint): string {
  const ms = typeof ts === "bigint" ? Number(ts) * 1000 : ts * 1000;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Extract a readable agent name from a metadata URI slug or fall back to "Agent #id". */
export function agentNameFromUri(uri: string | undefined, id: number): string {
  if (!uri) return `Agent #${id}`;
  // ipfs://agent-name or https://…/agent-name or just a plain name
  const slug = uri.split("/").pop() ?? "";
  if (!slug || slug.startsWith("0x")) return `Agent #${id}`;
  // Convert kebab to title case
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
