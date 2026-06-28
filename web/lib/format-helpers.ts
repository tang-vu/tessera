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

/**
 * Per-tier style tokens. `hex` is the single source of truth for the tier hue
 * (consumed by the score ring + history chart); the class tokens drive pills.
 */
export const TIER_STYLES: Record<
  Tier,
  { text: string; bg: string; border: string; dot: string; hex: string; glow: string }
> = {
  Untrusted: {
    text: "text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-400/25",
    dot: "bg-rose-400",
    hex: "#fb7185",
    glow: "rgba(251,113,133,0.45)",
  },
  Emerging: {
    text: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-400/25",
    dot: "bg-amber-400",
    hex: "#fbbf24",
    glow: "rgba(251,191,36,0.45)",
  },
  Established: {
    text: "text-indigo-300",
    bg: "bg-indigo-500/10",
    border: "border-indigo-400/25",
    dot: "bg-indigo-400",
    hex: "#818cf8",
    glow: "rgba(129,140,248,0.45)",
  },
  Prime: {
    text: "text-teal-300",
    bg: "bg-teal-500/10",
    border: "border-teal-400/25",
    dot: "bg-teal-400",
    hex: "#2dd4bf",
    glow: "rgba(45,212,191,0.5)",
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
