import { BookOpen } from "lucide-react";

interface LibraryCardProps {
  title: string;
  description: string;
  track?: string;
  onClick?: () => void;
}

export default function LibraryCard({ title, description, track, onClick }: LibraryCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-[hsl(var(--surface-panel))] p-5 text-left transition-colors hover:border-primary/30"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--surface-inset))]">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          {track && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
              {track}
            </span>
          )}
          <h3 className="text-sm font-semibold text-foreground leading-snug">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}
