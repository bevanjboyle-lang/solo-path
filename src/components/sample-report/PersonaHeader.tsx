import { Badge } from "@/components/ui/badge";
import GlassCard from "@/components/ui/GlassCard";
import { SAMPLE_PERSONA } from "@/data/sampleReportData";

export default function PersonaHeader() {
  const p = SAMPLE_PERSONA;
  return (
    <GlassCard noHover className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
        {p.name}
      </h1>
      <p className="mt-1 text-base font-medium text-foreground/80">{p.role}</p>
      <p className="mt-1 text-sm text-muted-foreground">{p.subtitle}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{p.sector} · {p.seniority}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline" className="text-[11px] font-medium">
          Income urgency: {p.income_urgency}
        </Badge>
        <Badge variant="outline" className="text-[11px] font-medium">
          Independence confidence: {p.independence_confidence}
        </Badge>
      </div>
    </GlassCard>
  );
}
