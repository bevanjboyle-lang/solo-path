import GlassCard from "@/components/ui/GlassCard";
import { SAMPLE_AI_IMPACT } from "@/data/sampleReportData";

function RiskBar({ level, max = 5, inverted }: { level: number; max?: number; inverted?: boolean }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < level;
        let color: string;
        if (!filled) {
          color = "bg-muted";
        } else if (inverted) {
          color = level <= 2 ? "bg-emerald-500" : level <= 3 ? "bg-amber-400" : "bg-red-400";
        } else {
          color = level <= 2 ? "bg-emerald-500" : level <= 3 ? "bg-amber-400" : "bg-red-400";
        }
        return <span key={i} className={`h-2.5 w-6 rounded-sm ${color}`} />;
      })}
      <span className="ml-2 text-xs text-muted-foreground">{level}/{max}</span>
    </div>
  );
}

export default function AIImpactSection() {
  const ai = SAMPLE_AI_IMPACT;
  return (
    <GlassCard noHover className="p-6 sm:p-8">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-primary">AI Impact Assessment</h2>

      <div className="space-y-6">
        {/* Current role risk */}
        <div>
          <h3 className="text-sm font-semibold text-foreground">Current role displacement risk</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{ai.current_role.headline}</p>
          <RiskBar level={ai.current_role.risk_level} />
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ai.current_role.text}</p>
        </div>

        {/* Plan B resilience */}
        <div>
          <h3 className="text-sm font-semibold text-foreground">Plan B resilience</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{ai.plan_b.headline}</p>
          <RiskBar level={ai.plan_b.risk_level} inverted />
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ai.plan_b.text}</p>
        </div>

        {/* Adaptation strategy */}
        <div>
          <h3 className="text-sm font-semibold text-foreground">{ai.adaptation.headline}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{ai.adaptation.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ai.adaptation.tools.map((tool) => (
              <span
                key={tool}
                className="rounded-md border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
