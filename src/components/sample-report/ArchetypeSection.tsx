import type { SoloCoreReport } from "@/types/canonical";

interface Props {
  archetype: SoloCoreReport["archetype"];
}

export default function ArchetypeSection({ archetype }: Props) {
  const { primary, secondary, summary, editorial_description, capability_tags } = archetype;
  // Canonical `editorial_description` is a single string; some narratives use
  // double newlines to delineate paragraphs. Split on those, fall back to a
  // single paragraph if none are present.
  const paragraphs = (editorial_description ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section>
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#15735F]">Your Archetype</h2>
      <h3 className="mb-2 text-xl font-bold tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
        {primary}
      </h3>
      {secondary && (
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Secondary: <span className="text-foreground/70 normal-case tracking-normal">{secondary}</span>
        </p>
      )}
      {summary && (
        <p className="mb-4 text-sm font-medium text-foreground/80">{summary}</p>
      )}
      <div className="space-y-4">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">{para}</p>
        ))}
      </div>
      {capability_tags && capability_tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {capability_tags.map((tag) => (
            <span
              key={tag}
              className="border border-border px-3 py-1 text-[11px] font-medium text-[#15735F]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
