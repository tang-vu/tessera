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
  const deltaColor = d.delta >= 0 ? "text-emerald-400" : "text-red-400";

  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 shadow-xl text-sm min-w-[180px]">
      <div className="flex items-center justify-between gap-4 mb-1">
        <span className="text-text-secondary text-xs">Score</span>
        <span className="font-bold text-text-primary tabular-nums">{d.newScore}</span>
      </div>
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-text-secondary text-xs">Delta</span>
        <span className={`font-semibold tabular-nums ${deltaColor}`}>
          {deltaSign}{d.delta}
        </span>
      </div>
      {d.reason && (
        <div className="border-t border-border pt-1.5">
          <p className="text-text-muted text-xs leading-relaxed">{d.reason}</p>
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
    { value: 200, label: "Emerging", color: "#f59e0b" },
    { value: 500, label: "Established", color: "#3b82f6" },
    { value: 800, label: "Prime", color: "#10b981" },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#252b38" vertical={false} />
        <XAxis
          dataKey="index"
          tickFormatter={(v: number) => (v < 0 ? "Start" : `#${v + 1}`)}
          tick={{ fill: "#4a5068", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[minScore, maxScore]}
          tick={{ fill: "#4a5068", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "4 4" }} />
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
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#scoreGradient)"
          dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
          activeDot={{ fill: "#60a5fa", r: 5, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
