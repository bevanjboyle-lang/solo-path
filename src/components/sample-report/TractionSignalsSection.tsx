import { SAMPLE_TRACTION_SIGNALS, type StrandTractionSignals, type TractionSignal } from "@/data/sampleReportData";

const weightColors: Record<string, string> = {
  negative: "bg-red-100 text-red-700 border-red-200",
  neutral: "bg-muted text-muted-foreground border-border",
  moderate: "bg-amber-100 text-amber-700 border-amber-200",
  strong: "bg-emerald-100 text-emerald-700 border-emerald-200",
  very_strong: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

function SignalItem({ signal }: { signal: TractionSignal }) {
  return (
    <div className="rounded bg-background border-l-[3px] border-border p-4">
      <div className="flex items-start gap-3">
        <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold shrink-0 mt-0.5 ${weightColors[signal.weight]}`}>
          {signal.weight.replace("_", " ")}
        </span>
        <p className="text-sm text-secondary-foreground">{signal.signal}</p>
      </div>
    </div>
  );
}

function StrandSignals({ strand }: { strand: StrandTractionSignals }) {
  return (
    <div className="rounded-lg border border-primary/40 bg-card p-5">
      <h3 className="text-sm font-bold text-foreground mb-4">{strand.model_name}</h3>
      <div className="space-y-3">
        {strand.signals.map((s, i) => <SignalItem key={i} signal={s} />)}
      </div>
    </div>
  );
}

export default function TractionSignalsSection() {
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-foreground mb-2">Tracking Your Traction</h2>
      <p className="text-sm text-muted-foreground mb-6">These signals indicate whether each strand is getting real market interest.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {SAMPLE_TRACTION_SIGNALS.map((s) => <StrandSignals key={s.strand_id} strand={s} />)}
      </div>
    </section>
  );
}
