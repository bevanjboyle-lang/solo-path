import { SAMPLE_RECOMMENDATION } from "@/data/sampleReportData";
import { CheckCircle } from "lucide-react";

export default function RecommendationSection() {
  const r = SAMPLE_RECOMMENDATION;
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-white mb-6">Why This Path</h2>
      <div className="rounded-lg bg-[#1A1F28] border-l-[6px] border-[#2ECDB0] p-6 sm:p-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#2ECDB0] mb-4">Our Recommendation</h3>
        <p className="text-sm leading-relaxed text-[#E8E8E8]">{r.rationale}</p>

        <div className="mt-6 rounded-lg border-2 border-[#2ECDB0] bg-[#1F2430] p-5 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-[#2ECDB0] shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed text-[#E8E8E8]">{r.key_condition}</p>
        </div>
      </div>
    </section>
  );
}
