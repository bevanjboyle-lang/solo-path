import GlassCard from "@/components/ui/GlassCard";
import { SAMPLE_RECOMMENDATION } from "@/data/sampleReportData";
import { AlertTriangle } from "lucide-react";

export default function RecommendationSection() {
  const r = SAMPLE_RECOMMENDATION;
  return (
    <GlassCard noHover className="p-6 sm:p-8">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Solo's Recommendation</h2>
      <h3 className="mb-4 text-lg font-bold tracking-tight text-foreground" style={{ letterSpacing: "-0.01em" }}>
        {r.headline}
      </h3>
      <div className="space-y-3">
        {r.paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">{p}</p>
        ))}
      </div>
      <div className="mt-5 rounded-lg border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
        <p className="text-sm leading-relaxed text-amber-900">{r.condition}</p>
      </div>
    </GlassCard>
  );
}
