import { SAMPLE_TRACTION_SIGNALS, type StrandTractionSignals, type TractionSignal } from "@/data/sampleReportData";

const weightColors: Record<string, string> = {
  negative: "bg-red-500/20 text-red-400 border-red-500/30",
  neutral: "bg-[#6B7280]/20 text-[#9CA3AF] border-[#6B7280]/30",
  moderate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  strong: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  very_strong: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
};

function SignalItem({ signal }: { signal: TractionSignal }) {
  return (
    <div className="rounded bg-[#0F1117] border-l-[3px] border-[#6B7280] p-4">
      <div className="flex items-start gap-3">
        <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold shrink-0 mt-0.5 ${weightColors[signal.weight]}`}>
          {signal.weight.replace("_", " ")}
        </span>
        <p className="text-sm text-[#E8E8E8]">{signal.signal}</p>
      </div>
    </div>
  );
}

function StrandSignals({ strand }: { strand: StrandTractionSignals }) {
  return (
    <div className="rounded-lg border border-[#2ECDB0]/40 bg-[#15191E] p-5">
      <h3 className="text-sm font-bold text-white mb-4">{strand.model_name}</h3>
      <div className="space-y-3">
        {strand.signals.map((s, i) => <SignalItem key={i} signal={s} />)}
      </div>
    </div>
  );
}

export default function TractionSignalsSection() {
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-white mb-2">Tracking Your Traction</h2>
      <p className="text-sm text-muted-foreground mb-6">These signals indicate whether each strand is getting real market interest.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {SAMPLE_TRACTION_SIGNALS.map((s) => <StrandSignals key={s.strand_id} strand={s} />)}
      </div>
    </section>
  );
}
