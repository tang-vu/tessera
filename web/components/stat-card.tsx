interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export function StatCard({ label, value, sub, accent = false }: StatCardProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
        {label}
      </div>
      <div className={`text-2xl font-bold tabular-nums tracking-tight ${accent ? "text-accent" : "text-text-primary"}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-text-muted">{sub}</div>}
    </div>
  );
}
