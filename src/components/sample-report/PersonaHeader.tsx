import { Badge } from "@/components/ui/badge";
import { SAMPLE_PERSONA } from "@/data/sampleReportData";
import { User, Briefcase } from "lucide-react";

// TODO Phase 3b: this component renders SAMPLE_PERSONA which has no canonical
// equivalent (the canonical report shape doesn't track persona separately).
// Repurpose or delete in the Plan.tsx wiring step.
export default function PersonaHeader() {
  const p = SAMPLE_PERSONA;
  return (
    <div
      className="rounded-2xl px-6 py-8 sm:px-8 sm:py-10 overflow-hidden relative"
      style={{ background: "#1D2025" }}
    >
      {/* Subtle mint accent glow */}
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(46,205,176,0.08)" }} />

      <div className="relative flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(46,205,176,0.15)" }}
        >
          <User className="h-6 w-6" style={{ color: "#2ECDB0" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1
            className="text-2xl font-bold tracking-tight sm:text-3xl text-white"
            style={{ letterSpacing: "-0.02em" }}
          >
            {p.name}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5" style={{ color: "#2ECDB0" }} />
            <p className="text-base font-medium" style={{ color: "#2ECDB0" }}>{p.role}</p>
          </div>
          <p className="mt-1 text-sm" style={{ color: "#B0ADA8" }}>{p.subtitle}</p>
          <p className="mt-0.5 text-xs" style={{ color: "#9B9893" }}>{p.sector} · {p.seniority}</p>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        <Badge
          className="text-[11px] font-medium border hover:opacity-90"
          style={{ background: "rgba(46,205,176,0.12)", color: "#2ECDB0", borderColor: "rgba(46,205,176,0.3)" }}
        >
          Income urgency: {p.income_urgency}
        </Badge>
        <Badge
          className="text-[11px] font-medium border hover:opacity-90"
          style={{ background: "rgba(255,255,255,0.06)", color: "#9B9893", borderColor: "rgba(255,255,255,0.1)" }}
        >
          Independence confidence: {p.independence_confidence}
        </Badge>
      </div>
    </div>
  );
}
