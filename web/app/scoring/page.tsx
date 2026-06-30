import Link from "next/link";
import {
  BASELINE,
  MAX_SCORE,
  DECAY_PER_DAY,
  REWARDS,
  PENALTIES,
  settlementDelta,
  type ScoreFactor,
} from "@/lib/scoring-model";

export const metadata = {
  title: "How Scoring Works — Tessera",
  description:
    "The exact, on-chain credit scoring model: every reward and penalty, the decay rule, and a worked example. No hidden math.",
};

const TIERS = [
  { name: "Untrusted", range: "0 – 199", limit: "$0", fee: "1.00%", hex: "#fb7185" },
  { name: "Emerging", range: "200 – 499", limit: "$1,000", fee: "0.70%", hex: "#fbbf24" },
  { name: "Established", range: "500 – 799", limit: "$10,000", fee: "0.45%", hex: "#818cf8" },
  { name: "Prime", range: "800 – 1000", limit: "$50,000", fee: "0.20%", hex: "#2dd4bf" },
];

export default function ScoringPage() {
  // Worked example: a receipted, on-time, 1,000-USDC settlement.
  const perSettle = settlementDelta({ success: true, hasReceipt: true, onTime: true, amountUsdc: 1000 });
  const settles = 10;
  const finalScore = Math.min(MAX_SCORE, BASELINE + perSettle * settles);

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6">
      {/* Header */}
      <header className="fade-up">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3 py-1 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-iris" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/85">
            Fully transparent
          </span>
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          How <span className="text-gradient">scoring</span> works
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-text-secondary">
          Every agent's 0–1000 credit score is computed on-chain by a deliberately simple,
          auditable model. No black box — here is every point that moves it.
        </p>
      </header>

      {/* Baseline + range */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Callout label="Starting score" value={BASELINE.toString()} sub="every new agent begins here" gradient />
        <Callout label="Score range" value={`0 – ${MAX_SCORE}`} sub="clamped at both ends" />
        <Callout label="Daily decay" value={`−${DECAY_PER_DAY}/day`} sub="pulls scores toward baseline" />
      </section>

      {/* Rewards + penalties ledger */}
      <section className="grid gap-5 lg:grid-cols-2">
        <Ledger
          title="Earns score"
          tone="up"
          factors={REWARDS}
          accent="linear-gradient(90deg,#2dd4bf,transparent)"
        />
        <Ledger
          title="Loses score"
          tone="down"
          factors={PENALTIES}
          accent="linear-gradient(90deg,#fb7185,transparent)"
        />
      </section>

      {/* Worked example */}
      <section className="card accent-line p-6 sm:p-8">
        <h2 className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
          Worked example — how Atlas reached {finalScore}
        </h2>
        <p className="mb-6 text-sm text-text-secondary">
          A single receipted, on-time settlement of 1,000 USDC moves the score by{" "}
          <span className="font-semibold text-teal-300">+{perSettle}</span>.
        </p>
        <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
          <Token label="Receipt" value="+25" tone="up" />
          <Plus />
          <Token label="On-time" value="+5" tone="up" />
          <Plus />
          <Token label="Volume (1k)" value="+10" tone="up" />
          <span className="text-text-muted">=</span>
          <Token label="Per settlement" value={`+${perSettle}`} tone="up" strong />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-mono text-text-secondary">
            {BASELINE} <span className="text-text-muted">baseline</span>
          </span>
          <span className="text-text-muted">+</span>
          <span className="font-mono text-text-secondary">
            {settles} × {perSettle}
          </span>
          <svg width="28" height="12" viewBox="0 0 28 12" fill="none" className="text-teal-300">
            <path d="M0 6h22M18 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-display text-2xl font-bold text-gradient">{finalScore}</span>
          <span className="rounded-full border border-teal-400/25 bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-300">
            Prime
          </span>
        </div>
      </section>

      {/* Tier ladder → terms */}
      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
            Score → credit terms
          </h2>
          <Link href="/credit" className="text-xs text-iris hover:underline">
            Live tiers on Credit Pool →
          </Link>
        </div>
        <div className="space-y-2.5">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-hairline bg-white/[0.02] px-4 py-3"
            >
              <span className="inline-flex items-center gap-2 font-semibold" style={{ color: t.hex }}>
                <span className="h-2 w-2 rounded-full" style={{ background: t.hex }} />
                {t.name}
              </span>
              <span className="font-mono text-xs text-text-muted">score {t.range}</span>
              <span className="ml-auto flex gap-6 text-sm">
                <span className="text-text-secondary">
                  limit <span className="font-semibold text-text-primary">{t.limit}</span>
                </span>
                <span className="text-text-secondary">
                  fee <span className="font-semibold text-text-primary">{t.fee}</span>
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-xs text-text-muted">
        Scoring math lives in{" "}
        <span className="font-mono text-text-secondary">ReputationOracle.sol</span> — verified on Blockscout.
        Only authorized contracts can write scores.
      </p>
    </div>
  );
}

function Callout({ label, value, sub, gradient = false }: { label: string; value: string; sub: string; gradient?: boolean }) {
  return (
    <div className="card p-5">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">{label}</div>
      <div className={`mt-2 font-display text-3xl font-bold tabular-nums ${gradient ? "text-gradient" : "text-text-primary"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-text-muted">{sub}</div>
    </div>
  );
}

function Ledger({ title, tone, factors, accent }: { title: string; tone: "up" | "down"; factors: ScoreFactor[]; accent: string }) {
  const color = tone === "up" ? "text-teal-300" : "text-rose-300";
  return (
    <div className="card accent-line p-5 sm:p-6" style={{ ["--accent-line" as string]: accent }}>
      <h2 className="mb-4 font-display text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
        {title}
      </h2>
      <div className="space-y-3">
        {factors.map((f) => (
          <div key={f.label} className="flex gap-3">
            <span className={`mt-0.5 w-14 flex-shrink-0 text-right font-mono text-sm font-semibold ${color}`}>
              {f.points}
            </span>
            <div>
              <div className="text-sm font-medium text-text-primary">{f.label}</div>
              <div className="text-xs leading-relaxed text-text-muted">{f.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Token({ label, value, tone, strong = false }: { label: string; value: string; tone: "up" | "down"; strong?: boolean }) {
  const color = tone === "up" ? "text-teal-300" : "text-rose-300";
  return (
    <span
      className={`inline-flex flex-col items-center rounded-xl border px-3 py-1.5 ${
        strong ? "border-teal-400/40 bg-teal-500/10" : "border-hairline bg-white/[0.02]"
      }`}
    >
      <span className={`font-semibold ${color}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
    </span>
  );
}

function Plus() {
  return <span className="text-text-muted">+</span>;
}
