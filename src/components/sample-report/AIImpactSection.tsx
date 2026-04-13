import { SAMPLE_AI_IMPACT } from "@/data/sampleReportData";

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles = {
    low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    high: "bg-red-500/20 text-red-400 border-red-500/30",
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
      <h2 className="text-[1.8rem] font-bold text-white">AI & Your Future</h2>

      {/* Part 1 */}
      <div className="rounded-lg bg-[#15191E] p-6">
        <h3 className="text-[1.3rem] font-bold text-white mb-3">{ai.part_1.heading}</h3>
        <div className="flex items-center gap-3 mb-4">
          <RiskBadge level={ai.part_1.displacement_risk} />
          <span className="text-sm text-muted-foreground">Risk horizon: {ai.part_1.risk_horizon}</span>
        </div>
        <p className="text-sm leading-relaxed text-[#E8E8E8]">{ai.part_1.content}</p>
      </div>

      {/* Part 2 */}
      <div className="rounded-lg bg-[#15191E] p-6">
        <h3 className="text-[1.3rem] font-bold text-white mb-3">{ai.part_2.heading}</h3>
        <div className="mb-4">
          <RiskBadge level={ai.part_2.displacement_risk} />
        </div>
        <p className="text-sm leading-relaxed text-[#E8E8E8]">{ai.part_2.content}</p>
      </div>

      {/* Part 3 */}
      <div className="rounded-lg bg-[#15191E] p-6">
        <h3 className="text-[1.3rem] font-bold text-white mb-4">{ai.part_3.heading}</h3>
        <div className="space-y-4">
          {ai.part_3.steps.map((step) => (
            <div key={step.priority} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2ECDB0]/20 text-sm font-bold text-[#2ECDB0]">
                {step.priority}
              </span>
              <div>
                <p className="text-sm font-semibold text-white leading-relaxed">{step.action}</p>
                <p className="text-xs italic text-muted-foreground mt-1">{step.rationale}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
