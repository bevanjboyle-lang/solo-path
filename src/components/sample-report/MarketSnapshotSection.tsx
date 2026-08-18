import { useState } from "react";
import type { ReportRow, MarketSnapshotOutput } from "@/types/canonical";

interface Props {
  market_snapshots: ReportRow["market_snapshots"];
}

type Snapshot = NonNullable<ReportRow["market_snapshots"]>[string];

function SnapshotContent({ sections }: { sections: MarketSnapshotOutput["sections"] }) {
  const fields = [
    { label: "Demand Signal", value: sections.demand_signal },
    { label: "Pricing Benchmark", value: sections.pricing_benchmark },
    { label: "Competitor Landscape", value: sections.competitor_landscape },
    { label: "Market Entry Insight", value: sections.market_entry_insight },
    { label: "Honest Assessment", value: sections.honest_assessment },
  ];
  return (
    <div className="space-y-0 divide-y divide-border">
      {fields.map((f) => (
        <div key={f.label} className="py-4 first:pt-0 last:pb-0">
          <h4 className="text-[1.1rem] font-bold text-foreground mb-2">{f.label}</h4>
          <p className="text-sm leading-relaxed text-secondary-foreground">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function MarketSnapshotSection({ market_snapshots }: Props) {
  // Convert keyed object to ordered array (stable by strand_id alpha order).
  const entries: Snapshot[] = market_snapshots
    ? Object.values(market_snapshots).filter(Boolean)
    : [];
  const sorted = [...entries].sort((a, b) => a.strand_id.localeCompare(b.strand_id));

  const [active, setActive] = useState(0);

  if (sorted.length === 0) return null;

  const current = sorted[active];

  return (
    <section>
      <h2 className="report-h2 text-foreground mb-2">Market Feasibility: What You're Walking Into</h2>
      <p className="text-sm text-muted-foreground mb-6">A reality check on demand, pricing, competition, and entry strategy for each strand.</p>

      <div className="flex gap-0 border-b border-border mb-0">
        {sorted.map((s, i) => (
          <button
            key={s.strand_id}
            onClick={() => setActive(i)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
              active === i
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.model_name}
          </button>
        ))}
      </div>

      <div className="rounded-b-lg border border-t-0 border-primary/40 bg-card p-6 sm:p-8">
        <h3 className="text-[1.3rem] font-bold text-foreground mb-1">{current.model_name}</h3>
        {current.location && (
          <p className="text-xs text-muted-foreground mb-5">{current.location}</p>
        )}
        <SnapshotContent sections={current.sections} />
      </div>
    </section>
  );
}
