interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export function StatCard({ label, value, sub, accent = false }: StatCardProps) {
  return (
    <div className="card accent-line p-5" style={accent ? undefined : { ["--accent-line" as string]: "linear-gradient(90deg, rgba(124,131,255,0.4), transparent)" }}>
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
        {label}
      </div>
      <div
        className={`mt-2 font-display text-2xl font-bold tabular-nums tracking-tight ${
          accent ? "text-gradient" : "text-text-primary"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-text-muted">{sub}</div>}
    </div>
  );
}
