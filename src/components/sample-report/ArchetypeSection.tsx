import GlassCard from "@/components/ui/GlassCard";
import { SAMPLE_ARCHETYPE } from "@/data/sampleReportData";

export default function ArchetypeSection() {
  const a = SAMPLE_ARCHETYPE;
  return (
    <GlassCard noHover className="p-6 sm:p-8">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Your Archetype</h2>
      <h3 className="mb-4 text-xl font-bold tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
        {a.title}
      </h3>
      <div className="space-y-4">
        {a.description.map((para, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">{para}</p>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {a.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary"
          >
            {tag}
          </span>
        ))}
      </div>
    </GlassCard>
  );
}
