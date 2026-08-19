import { useEffect, useRef, type ReactNode } from "react";

/*
 * Reveal — Sprint 3 motion grammar (2026-08-18).
 *
 * The product's one motion verb: a 12px fade-rise on a decelerating
 * curve when the wrapped block first enters the viewport. CSS does the
 * animation (.reveal / .is-in in index.css); this component only
 * observes. Plays once per mount, never re-hides. `delay` staggers
 * siblings that enter together (report sections on first paint);
 * `hero` is the rank-1 variant with a slightly longer rise.
 *
 * Reduced-motion users get content instantly via the CSS media query,
 * and if IntersectionObserver is missing the class flips on mount, so
 * nothing can be trapped invisible.
 */

interface Props {
  children: ReactNode;
  delay?: number;
  hero?: boolean;
  className?: string;
}

export default function Reveal({ children, delay = 0, hero = false, className = "" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${hero ? "reveal--hero" : ""} ${className}`.trim()}
      style={delay > 0 ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
