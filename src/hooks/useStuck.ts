import { useEffect, useRef, useState } from "react";

/*
 * useStuck — Sprint 3 (2026-08-18). Tells a position:sticky element when
 * it is actually pinned, so the pinned state can earn its whisper of
 * shadow (.is-stuck transitions in index.css). Render the returned
 * sentinel ref on a zero-height div immediately BEFORE the sticky
 * element; when the sentinel scrolls out under the sticky offset, the
 * element is stuck.
 */
export function useStuck<T extends HTMLElement = HTMLDivElement>(topOffsetPx = 6) {
  const sentinelRef = useRef<T | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { rootMargin: `-${topOffsetPx}px 0px 0px 0px`, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [topOffsetPx]);

  return { sentinelRef, stuck };
}
