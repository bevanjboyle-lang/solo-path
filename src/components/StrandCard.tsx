import MoveTypeBadge from "@/components/MoveTypeBadge";

export interface StrandData {
  title: string;
  pitch: string;
  primary_move_type?: string | null;
}

interface StrandCardProps {
  strand: StrandData;
}

/**
 * StrandCard — summary mode for /teaser.
 * Shows title, one-line pitch, and primary_move_type badge.
 * The same component will be extended for /plan with additional props.
 */
export default function StrandCard({ strand }: StrandCardProps) {
  return (
    <div className="rounded-lg border border-border bg-[hsl(var(--surface-panel))] p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-foreground leading-snug">
          {strand.title}
        </h3>
        <MoveTypeBadge moveType={strand.primary_move_type} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {strand.pitch}
      </p>
    </div>
  );
}
