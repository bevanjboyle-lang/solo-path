import type { SoloCoreReport, YearProjection } from "@/types/canonical";

interface Props {
  income_outlook: SoloCoreReport["income_outlook"];
}

function YearCard({ year, label }: { year: YearProjection; label: string }) {
  return (
    <div className="rounded-md bg-card border border-primary/40 p-5">
      <h3 className="text-sm font-bold text-primary mb-3">{label}</h3>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-lg font-bold text-primary">£{(year.low_gbp / 1000).toFixed(0)}k</span>
        <span className="text-muted-foreground">–</span>
        <span className="text-lg font-bold text-primary">£{(year.mid_gbp / 1000).toFixed(0)}k</span>
        <span className="text-muted-foreground">–</span>
        <span className="text-lg font-bold text-primary">£{(year.high_gbp / 1000).toFixed(0)}k</span>
      </div>
      <p className="text-sm text-secondary-foreground mb-2">{year.revenue_build}</p>
      <p className="text-xs text-muted-foreground mb-1">{year.revenue_sources}</p>
      <p className="text-xs italic text-muted-foreground/70">{year.assumptions}</p>
    </div>
  );
}

export default function IncomeOutlookSection({ income_outlook }: Props) {
  const io = income_outlook;
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-foreground mb-2">Your Income Trajectory</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Three-year projection for your #1 path. Low / mid / high scenarios per year.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <YearCard year={io.year_1} label="Year 1" />
        <YearCard year={io.year_2} label="Year 2" />
        <YearCard year={io.year_3} label="Year 3" />
      </div>

      <div className="space-y-4">
        <div className="rounded bg-muted border-l-4 border-primary p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Sensitivity Factors</h4>
          <p className="text-sm text-secondary-foreground">{io.sensitivity_factors}</p>
        </div>
        <div className="rounded bg-muted border-l-4 border-primary p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Income Floor</h4>
          <p className="text-sm text-secondary-foreground">{io.income_floor_analysis}</p>
        </div>
      </div>

      {io.income_notes && (
        <p className="mt-4 text-xs italic text-muted-foreground/70">{io.income_notes}</p>
      )}
    </section>
  );
}
