import StrandCard, { type StrandData } from "@/components/StrandCard";

interface ReportSectionProps {
  narrative?: string | null;
  strands?: StrandData[];
  locked?: boolean;
}

/**
 * ReportSection — renders report content on both /teaser and /plan.
 * Single component, two modes via `locked` prop.
 * On /teaser (locked=false in free preview): shows narrative + strand cards.
 * On /plan (locked=false, full): same component, extended data.
 */
export default function ReportSection({ narrative, strands = [], locked = false }: ReportSectionProps) {
  if (locked) return null; // locked rendering handled by TeaserLockedSection

  return (
    <div className="space-y-6">
      {narrative && (
        <p className="text-[15px] leading-[1.7] text-muted-foreground">
          {narrative}
        </p>
      )}
      {strands.length > 0 && (
        <div className="space-y-4">
          {strands.map((strand, i) => (
            <StrandCard key={i} strand={strand} />
          ))}
        </div>
      )}
    </div>
  );
}
