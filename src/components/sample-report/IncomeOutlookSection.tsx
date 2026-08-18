import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { SoloCoreReport, YearProjection } from "@/types/canonical";

interface Props {
  income_outlook: SoloCoreReport["income_outlook"];
}

function YearCard({ year, label }: { year: YearProjection; label: string }) {
  return (
    <div className="border-t-[3px] border-foreground bg-card p-5">
      <h3 className="text-sm font-bold text-[#15735F] mb-3">{label}</h3>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-lg font-bold text-[#15735F] tabular-nums">£{(year.low_gbp / 1000).toFixed(0)}k</span>
        <span className="text-muted-foreground">–</span>
        <span className="text-lg font-bold text-[#15735F] tabular-nums">£{(year.mid_gbp / 1000).toFixed(0)}k</span>
        <span className="text-muted-foreground">–</span>
        <span className="text-lg font-bold text-[#15735F] tabular-nums">£{(year.high_gbp / 1000).toFixed(0)}k</span>
      </div>
      <p className="text-sm text-secondary-foreground mb-2">{year.revenue_build}</p>
      <p className="text-xs text-muted-foreground mb-1">{year.revenue_sources}</p>
      <p className="text-xs italic text-muted-foreground/70">{year.assumptions}</p>
    </div>
  );
}

/**
 * Three-year low/mid/high bar chart. F77 — paid /plan deliverable was text-
 * only while the /teaser locked-tease (LockedSections.IncomeOutlookTeaser)
 * showed a decorative bar chart, which inverted the conversion logic
 * ("the locked preview looked more premium than the unlocked report").
 * This is the unlocked equivalent fed by the actual income_outlook data.
 */
function IncomeChart({ io }: { io: SoloCoreReport["income_outlook"] }) {
  const data = [
    {
      name: "Year 1",
      low: Math.round(io.year_1.low_gbp / 1000),
      mid: Math.round(io.year_1.mid_gbp / 1000),
      high: Math.round(io.year_1.high_gbp / 1000),
    },
    {
      name: "Year 2",
      low: Math.round(io.year_2.low_gbp / 1000),
      mid: Math.round(io.year_2.mid_gbp / 1000),
      high: Math.round(io.year_2.high_gbp / 1000),
    },
    {
      name: "Year 3",
      low: Math.round(io.year_3.low_gbp / 1000),
      mid: Math.round(io.year_3.mid_gbp / 1000),
      high: Math.round(io.year_3.high_gbp / 1000),
    },
  ];

  return (
    <div className="mb-6 border border-border bg-card p-5">
      <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-[#15735F]">Three-year revenue trajectory</h3>
      <p className="mb-4 text-xs text-muted-foreground">£ thousands per year. Three scenarios: low (cautious), mid (most likely), high (stretch).</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barGap={4} barCategoryGap="22%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#7A7670" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#7A7670" }}
            tickFormatter={(v: number) => `£${v}k`}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "#FAF9F7",
              border: "1px solid #D1CEC7",
              borderRadius: 0,
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [`£${value}k`, name]}
            cursor={{ fill: "#2ECDB0", opacity: 0.06 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: "#7A7670", paddingTop: 8 }}
          />
          <Bar dataKey="low" name="Low" fill="#6EE7D3" radius={[0, 0, 0, 0]} />
          <Bar dataKey="mid" name="Mid (most likely)" fill="#2ECDB0" radius={[0, 0, 0, 0]} />
          <Bar dataKey="high" name="High" fill="#15735F" radius={[0, 0, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function IncomeOutlookSection({ income_outlook }: Props) {
  const io = income_outlook;
  return (
    <section>
      <h2 className="report-h2 text-foreground mb-2">Your Income Trajectory</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Three-year projection for your #1 path. Low / mid / high scenarios per year.
      </p>

      <IncomeChart io={io} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <YearCard year={io.year_1} label="Year 1" />
        <YearCard year={io.year_2} label="Year 2" />
        <YearCard year={io.year_3} label="Year 3" />
      </div>

      <div className="space-y-4">
        <div className="bg-muted border-l-[3px] border-primary p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Sensitivity Factors</h4>
          <p className="text-sm text-secondary-foreground">{io.sensitivity_factors}</p>
        </div>
        <div className="bg-muted border-l-[3px] border-primary p-5">
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
