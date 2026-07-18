import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookie-consent";

/**
 * CookieBanner — global essential-cookies notice.
 * Renders once at the app root. Hidden permanently after the user dismisses.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "dismissed") {
        setVisible(true);
      }
    } catch {
      // localStorage may be unavailable (private mode); fail silent
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // ignore
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-[hsl(var(--surface-stone))] bg-[#FAF9F7]"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-foreground">
          This site uses essential cookies for login and security, plus EU-hosted analytics to understand how the product is used. No advertising cookies.{" "}
          <Link
            to="/privacy"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
          >
            Learn more
          </Link>
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={dismiss}
          className="shrink-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
