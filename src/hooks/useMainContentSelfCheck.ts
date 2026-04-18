import { useEffect, useState } from "react";

/**
 * Render-time self-check: after mount, scan the document for any visible
 * <h1> or <h2> with non-empty text. If none exist, signal a render regression
 * so the calling page can surface a loud fallback Banner instead of
 * silently shipping an empty screen.
 *
 * Returns `true` when a regression is detected (no headings found).
 */
export function useMainContentSelfCheck(enabled = true): boolean {
  const [regression, setRegression] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // Wait one frame so motion/whileInView transitions and async data have a
    // chance to mount their content before we audit the DOM.
    const t = window.setTimeout(() => {
      const headings = document.querySelectorAll("main h1, main h2");
      const hasHeading = Array.from(headings).some(
        (el) => (el.textContent || "").trim().length > 0
      );
      if (!hasHeading) setRegression(true);
    }, 600);
    return () => window.clearTimeout(t);
  }, [enabled]);

  return regression;
}
