import { useEffect, useState } from "react";

/**
 * Render-time self-check: 1 second after mount, audit the rendered DOM.
 * Trigger a regression signal when ANY of the following hold:
 *   - no <main> element exists
 *   - main.innerText (visible text) is < 100 chars
 *   - the document has zero h1/h2 elements with non-empty text
 *
 * Skipped on /auth so the (legitimately small) sign-in card does not trip it.
 *
 * Returns `true` when a regression is detected.
 */
export function useMainContentSelfCheck(enabled = true): boolean {
  const [regression, setRegression] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    // Never run on /auth — that page has a small card by design.
    if (window.location.pathname.startsWith("/auth")) return;

    const t = window.setTimeout(() => {
      const main = document.querySelector("main");
      if (!main) {
        setRegression(true);
        return;
      }
      const text = (main as HTMLElement).innerText || "";
      if (text.trim().length < 100) {
        setRegression(true);
        return;
      }
      const headings = document.querySelectorAll("h1, h2");
      const hasHeading = Array.from(headings).some(
        (el) => (el.textContent || "").trim().length > 0
      );
      if (!hasHeading) setRegression(true);
    }, 1000);

    return () => window.clearTimeout(t);
  }, [enabled]);

  return regression;
}
