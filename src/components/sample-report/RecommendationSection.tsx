import { CheckCircle } from "lucide-react";
import type { SoloCoreReport } from "@/types/canonical";

interface Props {
  recommendation: SoloCoreReport["recommendation"];
  options?: SoloCoreReport["options"];
}

export default function RecommendationSection({ recommendation, options }: Props) {
  const { recommended_rank, rationale, key_condition } = recommendation;
  const recommendedOption = options?.find((o) => o.rank === recommended_rank);

  return (
    <section>
      <h2 className="report-h2 text-foreground mb-6">Why This Path</h2>
      <div className="border-l-[3px] border-primary pl-6 sm:pl-10 py-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#15735F] mb-2">Our Recommendation</h3>
        {recommendedOption && (
          <p className="text-base font-bold text-foreground mb-4 flex items-center gap-2 flex-wrap">
            <span>{recommendedOption.model_name}</span>
            {recommendedOption.tier === "front_runner" ? (
              <span className="bg-surface-mint-tint px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--mint-text))]">
                Front runner
              </span>
            ) : (
              <span className="bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Rank {recommendedOption.rank}
              </span>
            )}
          </p>
        )}
        <p className="text-sm leading-relaxed text-secondary-foreground">{rationale}</p>

        <div className="mt-6 border border-border bg-accent p-5 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-[#15735F] shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed text-secondary-foreground">{key_condition}</p>
        </div>
      </div>
    </section>
  );
}
