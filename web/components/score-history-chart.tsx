"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ScoreEvent } from "@/app/api/agent/[id]/route";

interface ScoreHistoryChartProps {
  events: ScoreEvent[];
  currentScore: number;
}

interface TooltipPayload {
  payload?: {
    newScore: number;
    delta: number;
    reason: string;
    index: number;
  };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const deltaSign = d.delta >= 0 ? "+" : "";
  const deltaColor = d.delta >= 0 ? "text-teal-300" : "text-rose-300";

  return (
    <div className="glass-strong min-w-[180px] rounded-xl px-3 py-2.5 text-sm shadow-xl">
      <div className="mb-1 flex items-center justify-between gap-4">
        <span className="text-xs text-text-secondary">Score</span>
        <span className="font-display font-bold tabular-nums text-text-primary">{d.newScore}</span>
      </div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-xs text-text-secondary">Delta</span>
        <span className={`font-semibold tabular-nums ${deltaColor}`}>
          {deltaSign}{d.delta}
        </span>
      </div>
      {d.reason && (
        <div className="border-t border-hairline pt-1.5">
          <p className="text-xs leading-relaxed text-text-muted">{d.reason}</p>
        </div>
      )}
    </div>
  );
}

export function ScoreHistoryChart({ events, currentScore }: ScoreHistoryChartProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        No score history yet
      </div>
    );
  }

  // Build chart data: prepend a synthetic "baseline" point then all events
  const data = [
    { index: -1, newScore: 500, delta: 0, reason: "Baseline" },
    ...events,
  ];

  const minScore = Math.max(0, Math.min(...data.map((d) => d.newScore)) - 50);
  const maxScore = Math.min(1000, Math.max(...data.map((d) => d.newScore)) + 50);

  // Tier reference lines
  const TIER_LINES = [
    { value: 200, label: "Emerging", color: "#fbbf24" },
    { value: 500, label: "Established", color: "#818cf8" },
    { value: 800, label: "Prime", color: "#2dd4bf" },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#7c83ff" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="scoreStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c83ff" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="index"
          tickFormatter={(v: number) => (v < 0 ? "Start" : `#${v + 1}`)}
          tick={{ fill: "#5a607e", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[minScore, maxScore]}
          tick={{ fill: "#5a607e", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#7c83ff", strokeWidth: 1, strokeDasharray: "4 4" }} />
        {TIER_LINES.filter((t) => t.value >= minScore && t.value <= maxScore).map((t) => (
          <ReferenceLine
            key={t.value}
            y={t.value}
            stroke={t.color}
            strokeDasharray="4 4"
            strokeOpacity={0.4}
            label={{ value: t.label, fill: t.color, fontSize: 10, opacity: 0.7 }}
          />
        ))}
        <Area
          type="monotone"
          dataKey="newScore"
          stroke="url(#scoreStroke)"
          strokeWidth={2.5}
          fill="url(#scoreGradient)"
          dot={{ fill: "#a855f7", r: 3, strokeWidth: 0 }}
          activeDot={{ fill: "#22d3ee", r: 5, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
