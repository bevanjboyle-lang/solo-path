import { useState } from "react";
import { SAMPLE_MARKET_SNAPSHOTS, type MarketSnapshot } from "@/data/sampleReportData";

function SnapshotContent({ snapshot }: { snapshot: MarketSnapshot }) {
  const fields = [
    { label: "Demand Signal", value: snapshot.sections.demand_signal },
    { label: "Pricing Benchmark", value: snapshot.sections.pricing_benchmark },
    { label: "Competitor Landscape", value: snapshot.sections.competitor_landscape },
    { label: "Market Entry Insight", value: snapshot.sections.market_entry_insight },
    { label: "Honest Assessment", value: snapshot.sections.honest_assessment },
  ];
  return (
    <div className="space-y-0 divide-y divide-[#3B4252]">
      {fields.map((f) => (
        <div key={f.label} className="py-4 first:pt-0 last:pb-0">
          <h4 className="text-[1.1rem] font-bold text-white mb-2">{f.label}</h4>
          <p className="text-sm leading-relaxed text-[#E8E8E8]">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function MarketSnapshotSection() {
  const [active, setActive] = useState(0);
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-white mb-2">Market Feasibility: What You're Walking Into</h2>
      <p className="text-sm text-muted-foreground mb-6">A reality check on demand, pricing, competition, and entry strategy for each strand.</p>

      <div className="flex gap-0 border-b border-[#3B4252] mb-0">
        {SAMPLE_MARKET_SNAPSHOTS.map((s, i) => (
          <button
            key={s.strand_id}
            onClick={() => setActive(i)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
              active === i
                ? "border-[#2ECDB0] text-[#2ECDB0]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.model_name}
          </button>
        ))}
      </div>

      <div className="rounded-b-lg border border-t-0 border-[#2ECDB0] bg-[#15191E] p-6 sm:p-8">
        <h3 className="text-[1.3rem] font-bold text-white mb-1">{SAMPLE_MARKET_SNAPSHOTS[active].model_name}</h3>
        <p className="text-xs text-muted-foreground mb-5">{SAMPLE_MARKET_SNAPSHOTS[active].location}</p>
        <SnapshotContent snapshot={SAMPLE_MARKET_SNAPSHOTS[active]} />
      </div>
    </section>
  );
}
