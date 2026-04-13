import { SAMPLE_HOOK_INSIGHT } from "@/data/sampleReportData";
import { Lightbulb } from "lucide-react";

export default function HookInsightSection() {
  const h = SAMPLE_HOOK_INSIGHT;
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-foreground mb-6">Your Market Edge</h2>
      <div className="rounded-lg bg-muted border-l-[6px] border-primary p-6 sm:p-10">
        <div className="flex items-start gap-3 mb-4">
          <Lightbulb className="h-5 w-5 text-primary mt-1 shrink-0" />
          <h3 className="text-[1.5rem] font-bold text-primary leading-snug">{h.headline}</h3>
        </div>
        <p className="text-base leading-relaxed text-secondary-foreground">{h.insight}</p>
      </div>
    </section>
  );
}
