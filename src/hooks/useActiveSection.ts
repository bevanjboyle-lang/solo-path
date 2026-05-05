import { useEffect, useState } from "react";

interface UseActiveSectionOptions {
  /**
   * IntersectionObserver rootMargin. Default tunes the viewport so a section
   * is considered "active" once its top has crossed ~80px below the viewport
   * top (matching the sticky TopBar height) and remains active until its
   * bottom slides past the upper 40% of the viewport.
   */
  rootMargin?: string;
  threshold?: number;
}

/**
 * Tracks which of a list of section ids is currently "in view" using
 * IntersectionObserver. Returns the id of the section closest to the top of
 * the viewport (but past the rootMargin offset). Falls back to the first id
 * when nothing is in view.
 *
 * Used by PlanSidebar to highlight the currently-viewed section as the user
 * scrolls through /plan.
 */
export function useActiveSection(
  sectionIds: string[],
  options: UseActiveSectionOptions = {},
): string | null {
  const { rootMargin = "-80px 0px -60% 0px", threshold = 0 } = options;
  const [activeId, setActiveId] = useState<string | null>(
    sectionIds[0] ?? null,
  );

  // Stable string key so the effect re-runs only when the actual id list
  // changes, not on every render.
  const idsKey = sectionIds.join("|");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sectionIds.length === 0) {
      setActiveId(null);
      return;
    }

    // Track which ids are currently intersecting; pick the one whose top
    // is highest in the viewport (smallest top value >= 0, or closest to 0).
    const intersecting = new Set<string>();

    const pickActive = () => {
      if (intersecting.size === 0) return;
      let bestId: string | null = null;
      let bestTop = Number.POSITIVE_INFINITY;
      for (const id of intersecting) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        // Prefer sections whose top is at or just above the offset line.
        const score = top < 0 ? Math.abs(top) + 10000 : top;
        if (score < bestTop) {
          bestTop = score;
          bestId = id;
        }
      }
      if (bestId) setActiveId(bestId);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (!id) continue;
          if (entry.isIntersecting) {
            intersecting.add(id);
          } else {
            intersecting.delete(id);
          }
        }
        pickActive();
      },
      { rootMargin, threshold },
    );

    const observed: Element[] = [];
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        observed.push(el);
      }
    }

    return () => {
      for (const el of observed) observer.unobserve(el);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, rootMargin, threshold]);

  return activeId;
}
