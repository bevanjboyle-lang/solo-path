import GlassCard from "@/components/ui/GlassCard";
import { SAMPLE_HOOK_INSIGHT } from "@/data/sampleReportData";

export default function HookInsightSection() {
  const h = SAMPLE_HOOK_INSIGHT;
  return (
    <GlassCard noHover className="p-6 sm:p-8">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Key Insight</h2>
      <p className="text-lg font-bold leading-snug text-foreground" style={{ letterSpacing: "-0.01em" }}>
        {h.headline}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{h.body}</p>
      <div className="mt-4 rounded-lg border-l-4 border-primary/40 bg-primary/5 px-5 py-4">
        <p className="text-sm leading-relaxed text-foreground/90">{h.implication}</p>
      </div>
    </GlassCard>
  );
}
