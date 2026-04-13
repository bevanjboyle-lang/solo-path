import { SAMPLE_AI_IMPACT } from "@/data/sampleReportData";

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles = {
    low: "bg-emerald-100 text-emerald-800 border-emerald-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    high: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span className={`inline-block rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-wider ${styles[level]}`}>
      {level} risk
    </span>
  );
}

export default function AIImpactSection() {
  const ai = SAMPLE_AI_IMPACT;
  return (
    <section className="space-y-6">
      <h2 className="text-[1.8rem] font-bold text-foreground">AI & Your Future</h2>

      {/* Part 1 */}
      <div className="rounded-lg bg-card p-6">
        <h3 className="text-[1.3rem] font-bold text-foreground mb-3">{ai.part_1.heading}</h3>
        <div className="flex items-center gap-3 mb-4">
          <RiskBadge level={ai.part_1.displacement_risk} />
          <span className="text-sm text-muted-foreground">Risk horizon: {ai.part_1.risk_horizon}</span>
        </div>
        <p className="text-sm leading-relaxed text-secondary-foreground">{ai.part_1.content}</p>
      </div>

      {/* Part 2 */}
      <div className="rounded-lg bg-card p-6">
        <h3 className="text-[1.3rem] font-bold text-foreground mb-3">{ai.part_2.heading}</h3>
        <div className="mb-4">
          <RiskBadge level={ai.part_2.displacement_risk} />
        </div>
        <p className="text-sm leading-relaxed text-secondary-foreground">{ai.part_2.content}</p>
      </div>

      {/* Part 3 */}
      <div className="rounded-lg bg-card p-6">
        <h3 className="text-[1.3rem] font-bold text-foreground mb-4">{ai.part_3.heading}</h3>
        <div className="space-y-4">
          {ai.part_3.steps.map((step) => (
            <div key={step.priority} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {step.priority}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground leading-relaxed">{step.action}</p>
                <p className="text-xs italic text-muted-foreground mt-1">{step.rationale}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
