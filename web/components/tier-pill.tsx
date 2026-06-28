import { tierFromScore, TIER_STYLES, type Tier } from "@/lib/format-helpers";

interface TierPillProps {
  score: number;
  size?: "sm" | "md";
}

export function TierPill({ score, size = "md" }: TierPillProps) {
  const tier: Tier = tierFromScore(score);
  const styles = TIER_STYLES[tier];
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs font-semibold";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border backdrop-blur-sm",
        styles.bg,
        styles.text,
        styles.border,
        sizeClasses,
      ].join(" ")}
      style={{ boxShadow: `0 0 14px -4px ${styles.glow}` }}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {tier}
    </span>
  );
}
