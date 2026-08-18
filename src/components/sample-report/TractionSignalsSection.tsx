import { useState } from "react";
import type { ActivationPlanOutput, TractionSignal, TractionSignalGroup } from "@/types/canonical";

interface Props {
  traction_signals: ActivationPlanOutput["traction_signals"];
}

const weightMeta: Record<TractionSignal["weight"], { label: string; dot: string; order: number }> = {
  very_strong: { label: "Very strong", dot: "bg-emerald-500", order: 0 },
  strong: { label: "Strong", dot: "bg-emerald-400", order: 1 },
  moderate: { label: "Moderate", dot: "bg-amber-400", order: 2 },
  neutral: { label: "Neutral", dot: "bg-muted-foreground/50", order: 3 },
  negative: { label: "Caution", dot: "bg-red-400", order: 4 },
};

function SignalRow({ signal }: { signal: TractionSignal }) {
  const meta = weightMeta[signal.weight];
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed text-secondary-foreground">{signal.signal}</p>
      </div>
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
        {meta.label}
      </span>
    </div>
  );
}

function StrandTab({ strand }: { strand: TractionSignalGroup }) {
  const sorted = [...strand.signals].sort(
    (a, b) => weightMeta[a.weight].order - weightMeta[b.weight].order
  );
  return (
    <div className="px-1">
      {sorted.map((s, i) => (
        <SignalRow key={i} signal={s} />
      ))}
    </div>
  );
}

export default function TractionSignalsSection({ traction_signals }: Props) {
  const [active, setActive] = useState(0);

  if (!traction_signals || traction_signals.length === 0) return null;

  return (
    <section>
      <h2 className="report-h2 text-foreground mb-2">Tracking Your Traction</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Signals that indicate whether each strand is getting real market interest.
      </p>

      <div className="rounded-lg bg-card border border-border overflow-hidden">
        {/* Strand tabs */}
        <div className="flex border-b border-border">
          {traction_signals.map((s, i) => (
            <button
              key={s.strand_id}
              onClick={() => setActive(i)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                active === i
                  ? "border-primary text-primary bg-accent/50"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.model_name}
            </button>
          ))}
        </div>

        {/* Signal list */}
        <div className="p-5 sm:p-6">
          <StrandTab strand={traction_signals[active]} />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 border-t border-border px-5 py-3 bg-muted/30">
          {Object.entries(weightMeta).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              <span className="text-[10px] text-muted-foreground">{meta.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
