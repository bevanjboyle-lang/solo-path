import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SoloCoreReport } from "@/types/canonical";

type Option = SoloCoreReport["options"][number];

interface Props {
  options: SoloCoreReport["options"];
  recommended_selection?: SoloCoreReport["recommended_selection"];
}

function DifficultyPill({ rating }: { rating: "easy" | "moderate" | "hard" }) {
  const styles = {
    easy: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    moderate: "bg-amber-100 text-amber-800 border border-amber-200",
    hard: "bg-red-100 text-red-800 border border-red-200",
  };
  return <span className={`inline-block rounded px-2.5 py-0.5 text-[10px] font-bold uppercase ${styles[rating]}`}>{rating}</span>;
}

function ScoreRing({ score }: { score: number }) {
  const r = 28, c = 2 * Math.PI * r, offset = c - (score / 100) * c;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--border-strong))" strokeWidth="4" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--mint))" strokeWidth="4" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary">{Math.round(score)}</span>
    </div>
  );
}

function formatPrice(opt: Option) {
  const p = opt.pricing;
  return `£${p.range_low_gbp.toLocaleString()}–£${p.range_high_gbp.toLocaleString()} ${p.cadence}`;
}

function FullOptionCard({ option, recommended }: { option: Option; recommended: boolean }) {
  return (
    <div className={`rounded-lg p-6 ${recommended ? "border-2 border-primary bg-card" : "border border-border bg-card"}`}>
      <div className="flex items-start gap-4 mb-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {option.rank}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground">{option.model_name}</h3>
          {recommended && (
            <Badge className="mt-1 bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold uppercase">Recommended</Badge>
          )}
        </div>
        <ScoreRing score={option.composite_score} />
      </div>

      {option.fit_tags && option.fit_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {option.fit_tags.map((t) => (
            <span key={t} className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{t.replace(/_/g, " ")}</span>
          ))}
        </div>
      )}

      <p className="text-sm leading-relaxed text-secondary-foreground mb-5">{option.positioning}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Target Buyer</h4>
          <p className="text-sm text-secondary-foreground">{option.target_buyer}</p>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">What They Are Buying</h4>
          <p className="text-sm text-secondary-foreground">{option.what_they_are_buying}</p>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Pricing</h4>
          <p className="text-sm font-semibold text-primary">{formatPrice(option)}</p>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Time to First Revenue</h4>
          <p className="text-sm text-secondary-foreground">{option.time_to_first_revenue}</p>
          <div className="mt-1"><DifficultyPill rating={option.difficulty_rating} /></div>
        </div>
      </div>

      <p className="text-sm italic text-primary/80 border-l-2 border-primary/30 pl-3">{option.why_this_works_for_them}</p>

      {option.caution_note && (
        <div className="mt-3 border-l-2 border-red-400 pl-3">
          <p className="text-xs text-red-600">{option.caution_note}</p>
        </div>
      )}
    </div>
  );
}

function CompactOptionCard({ option }: { option: Option }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/70 text-[11px] font-bold text-primary-foreground">
          {option.rank}
        </span>
        <h3 className="text-sm font-semibold text-foreground flex-1">{option.model_name}</h3>
        <span className="text-xs font-bold text-primary">{Math.round(option.composite_score)}/100</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <DifficultyPill rating={option.difficulty_rating} />
        <span className="text-xs text-muted-foreground">{formatPrice(option)}</span>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        {expanded ? "Collapse" : "Expand"}
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          <p className="text-sm text-secondary-foreground">{option.positioning}</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-muted-foreground">Buyer:</span> <span className="text-secondary-foreground">{option.target_buyer}</span></div>
            <div><span className="text-muted-foreground">Revenue:</span> <span className="text-secondary-foreground">{option.time_to_first_revenue}</span></div>
          </div>
          <p className="text-sm italic text-secondary-foreground/80">{option.why_this_works_for_them}</p>
          {option.caution_note && (
            <div className="border-l-2 border-red-400 pl-3">
              <p className="text-xs text-red-600">{option.caution_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OptionsSection({ options, recommended_selection }: Props) {
  const sorted = [...(options ?? [])].sort((a, b) => a.rank - b.rank);
  const top = sorted.filter((o) => o.rank <= 3);
  const rest = sorted.filter((o) => o.rank > 3);
  const selectedRanks = new Set(recommended_selection?.selected_ranks ?? []);

  return (
    <section>
      <h2 className="report-h2 text-foreground mb-2">Your 10 Pathways to Independence</h2>
      <p className="text-sm text-muted-foreground mb-6">Ranked by fit with your background, market demand, and time to first revenue.</p>

      {top.length > 0 && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">Your Fastest Path</h3>
          <FullOptionCard option={top[0]} recommended={selectedRanks.has(top[0].rank) || top[0].rank === 1} />
        </>
      )}

      {top.length > 1 && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mt-8 mb-4">Top Alternatives</h3>
          <div className="space-y-5">
            {top.slice(1).map((o) => <FullOptionCard key={o.rank} option={o} recommended={selectedRanks.has(o.rank)} />)}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-8 mb-4">Additional Paths</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rest.map((o) => <CompactOptionCard key={o.rank} option={o} />)}
          </div>
        </>
      )}
    </section>
  );
}
