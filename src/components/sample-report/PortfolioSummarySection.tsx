import type { ActivationPlanOutput } from "@/types/canonical";

interface Props {
  portfolio_summary: ActivationPlanOutput["portfolio_summary"];
}

export default function PortfolioSummarySection({ portfolio_summary }: Props) {
  const { strategy, effort_distribution, strands } = portfolio_summary;
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-foreground mb-6">Your Portfolio at a Glance</h2>
      <div className="rounded-lg bg-card border-l-[6px] border-primary p-6 sm:p-8">
        <h3 className="text-[1.3rem] font-bold text-foreground mb-3">Your Strategic Approach</h3>
        <p className="text-sm leading-relaxed text-secondary-foreground mb-6">{strategy}</p>

        <h3 className="text-[1.3rem] font-bold text-foreground mb-3">How You'll Allocate Your Time</h3>
        <p className="text-sm leading-relaxed text-secondary-foreground mb-6">{effort_distribution}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {strands.map((s) => (
            <div key={s.strand_id} className="rounded-md bg-background border border-primary/40 p-4">
              <p className="text-xs text-muted-foreground mb-1">Strand {s.rank}</p>
              <p className="text-sm font-bold text-primary">{s.model_name}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{Math.round(s.time_weight * 100)}% of effort</p>
              <p className="text-xs text-secondary-foreground mt-2">{s.why_included}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
