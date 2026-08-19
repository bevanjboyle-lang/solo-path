import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/*
 * MobileWayfinder — extracted from Report.tsx (Sprint 3, 2026-08-18) so
 * the sample report's 24,000-pixel page finally gets mobile navigation
 * too. Sticky strip under the 46px mobile nav band: current section
 * numeral + label, n/total, mint progress hairline; tap opens the full
 * section list. Hidden at lg+ where the sidebar or TOC does this job.
 *
 * Sprint 3 also gives the strip its stuck-state transition: a scroll
 * sentinel just above the element tells us when it is actually pinned,
 * and the pinned state earns a whisper of shadow (.is-stuck).
 */

export interface WayfinderSection {
  id: string;
  label: string;
  numeral: string;
  readTime: string;
}

interface Props {
  sections: WayfinderSection[];
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Sticky offset in px. Defaults to 46 (the mobile nav band). Surfaces
   *  with extra pinned chrome above (the sample report's sample strip)
   *  pass their measured stack height. */
  topPx?: number;
  /** Raise above other pinned chrome where needed (sample report). */
  zClass?: string;
}

export default function MobileWayfinder({
  sections,
  activeId,
  onSelect,
  topPx = 46,
  zClass = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { rootMargin: `-${topPx}px 0px 0px 0px`, threshold: 0 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [topPx]);

  if (sections.length === 0) return null;
  const idx = Math.max(0, sections.findIndex((s) => s.id === activeId));
  const current = sections[idx];
  const progress = ((idx + 1) / sections.length) * 100;

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="lg:hidden" />
      <div
        className={`wayfinder lg:hidden ${zClass} ${stuck ? "is-stuck" : ""}`.trim()}
        style={topPx !== 46 ? { top: topPx } : undefined}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-6 py-2.5 text-left"
        >
          <span className="text-[10px] font-semibold tabular-nums text-[#15735F]">
            {current.numeral}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-foreground">
            {current.label}
          </span>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {idx + 1} / {sections.length}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <div className="h-[2px] bg-[#ECEAE4]">
          <div
            className="h-full bg-[#2ECDB0] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {open && (
          <div className="max-h-[60vh] overflow-y-auto border-t border-border bg-[#FAF9F7]">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelect(s.id);
                  setOpen(false);
                }}
                className={`flex w-full items-baseline gap-3 border-b border-border/60 px-6 py-3 text-left ${
                  s.id === activeId ? "bg-surface-mint-tint" : ""
                }`}
              >
                <span className="text-[10px] font-semibold tabular-nums text-[#15735F]">
                  {s.numeral}
                </span>
                <span className="flex-1 text-[13px] font-medium text-foreground">{s.label}</span>
                <span className="text-[10.5px] text-muted-foreground">{s.readTime}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
