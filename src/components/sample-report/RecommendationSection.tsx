import { SAMPLE_RECOMMENDATION } from "@/data/sampleReportData";
import { CheckCircle } from "lucide-react";

export default function RecommendationSection() {
  const r = SAMPLE_RECOMMENDATION;
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-foreground mb-6">Why This Path</h2>
      <div className="rounded-lg bg-card border-l-[6px] border-primary p-6 sm:p-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-4">Our Recommendation</h3>
        <p className="text-sm leading-relaxed text-secondary-foreground">{r.rationale}</p>

        <div className="mt-6 rounded-lg border-2 border-primary bg-accent p-5 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed text-secondary-foreground">{r.key_condition}</p>
        </div>
      </div>
    </section>
  );
}
