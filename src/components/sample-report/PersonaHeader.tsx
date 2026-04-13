import { Badge } from "@/components/ui/badge";
import GlassCard from "@/components/ui/GlassCard";
import { SAMPLE_PERSONA } from "@/data/sampleReportData";
import { User, Briefcase } from "lucide-react";

export default function PersonaHeader() {
  const p = SAMPLE_PERSONA;
  return (
    <GlassCard noHover className="p-6 sm:p-8 border-t-4 border-t-primary overflow-hidden relative">
      {/* Subtle mint accent glow */}
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/8 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <User className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
            {p.name}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 text-primary" />
            <p className="text-base font-medium text-primary">{p.role}</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{p.subtitle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{p.sector} · {p.seniority}</p>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        <Badge className="text-[11px] font-medium bg-primary/10 text-primary border-primary/25 hover:bg-primary/15">
          Income urgency: {p.income_urgency}
        </Badge>
        <Badge className="text-[11px] font-medium bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
          Independence confidence: {p.independence_confidence}
        </Badge>
      </div>
    </GlassCard>
  );
}
