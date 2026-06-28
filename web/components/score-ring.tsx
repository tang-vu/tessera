"use client";

import { useEffect, useState } from "react";
import { tierFromScore, TIER_STYLES } from "@/lib/format-helpers";

interface ScoreRingProps {
  score: number;
  /** Diameter in px. */
  size?: number;
  /** Stroke thickness in px. */
  stroke?: number;
  /** Show the tier label beneath the number. */
  showTier?: boolean;
}

/**
 * Circular credit-score gauge. The arc sweeps to score/1000 on mount and is
 * tinted by the tier hue with a soft glow — the hero element of an agent page.
 */
export function ScoreRing({ score, size = 188, stroke = 12, showTier = true }: ScoreRingProps) {
  const tier = tierFromScore(score);
  const { hex, glow } = TIER_STYLES[tier];
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, score / 1000));

  // Animate the arc + number from zero on mount / score change.
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setProgress(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const dash = circumference * progress;
  const gid = `ring-${tier}`;

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={hex} />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <filter id={`${gid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          filter={`url(#${gid}-glow)`}
          style={{
            transition: "stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </svg>

      {/* Center label */}
      <div
        className="absolute inset-0 grid place-items-center text-center"
        style={{ filter: `drop-shadow(0 0 18px ${glow})` }}
      >
        <div>
          <div
            className="font-display font-bold tabular-nums leading-none"
            style={{ fontSize: size * 0.27, color: hex }}
          >
            {score}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-text-muted">
            / 1000
          </div>
          {showTier && (
            <div
              className="mt-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: hex }}
            >
              {tier}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
