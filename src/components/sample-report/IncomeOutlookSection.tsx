import { SAMPLE_INCOME_OUTLOOK, type YearProjection } from "@/data/sampleReportData";

function YearCard({ year, label }: { year: YearProjection; label: string }) {
  return (
    <div className="rounded-md bg-[#15191E] border border-[#2ECDB0]/40 p-5">
      <h3 className="text-sm font-bold text-[#2ECDB0] mb-3">{label}</h3>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-lg font-bold text-[#2ECDB0]">£{(year.low_gbp / 1000).toFixed(0)}k</span>
        <span className="text-muted-foreground">–</span>
        <span className="text-lg font-bold text-[#2ECDB0]">£{(year.mid_gbp / 1000).toFixed(0)}k</span>
        <span className="text-muted-foreground">–</span>
        <span className="text-lg font-bold text-[#2ECDB0]">£{(year.high_gbp / 1000).toFixed(0)}k</span>
      </div>
      <p className="text-sm text-[#E8E8E8] mb-2">{year.revenue_build}</p>
      <p className="text-xs text-muted-foreground mb-1">{year.revenue_sources}</p>
      <p className="text-xs italic text-muted-foreground/70">{year.assumptions}</p>
    </div>
  );
}

export default function IncomeOutlookSection() {
  const io = SAMPLE_INCOME_OUTLOOK;
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-white mb-6">Your Income Trajectory</h2>

      <div className="mb-6">
        <p className="text-sm text-[#E8E8E8] mb-1">
          Current salary: <span className="font-bold text-[#2ECDB0]">£{io.current_salary_gbp.toLocaleString()}</span>
        </p>
        <p className="text-sm text-[#E8E8E8]">{io.salary_replacement_analysis}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <YearCard year={io.year_1} label="Year 1" />
        <YearCard year={io.year_2} label="Year 2" />
        <YearCard year={io.year_3} label="Year 3" />
      </div>

      <div className="space-y-4">
        <div className="rounded bg-[#1A1F28] border-l-4 border-[#2ECDB0] p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Sensitivity Factors</h4>
          <p className="text-sm text-[#E8E8E8]">{io.sensitivity_factors}</p>
        </div>
        <div className="rounded bg-[#1A1F28] border-l-4 border-[#2ECDB0] p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Income Floor</h4>
          <p className="text-sm text-[#E8E8E8]">{io.income_floor_analysis}</p>
        </div>
      </div>

      <p className="mt-4 text-xs italic text-muted-foreground/70">{io.income_notes}</p>
    </section>
  );
}
