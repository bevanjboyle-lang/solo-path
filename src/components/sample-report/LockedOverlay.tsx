import { useState, useCallback } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { triggerStripeCheckout } from "@/lib/handlers";

interface LockedOverlayProps {
  label?: string;
}

/**
 * Locked-section overlay rendered on /teaser to mark blurred-out content
 * (the sections that only unlock post-payment). Clicking the button must
 * trigger Stripe checkout exactly like the bottom CTA on /teaser does —
 * NOT navigate to /auth, which was the original wiring (a leftover from
 * when /auth was the gate before payment was added; sent already-authed
 * users into a /auth → /auth/callback → /teaser loop that looked like
 * "the page reloads when I click Unlock"). The five instances of this
 * component on /teaser (RecommendationTeaser, IncomeOutlookTeaser,
 * AIImpactTeaser, plus two BusinessPaths locked variants) all need the
 * same Stripe behaviour.
 *
 * Reads `report_id` from localStorage (Teaser.tsx writes it on mount at
 * line 90 via `localStorage.setItem("solo_report_id", reportId)`) so we
 * don't need to prop-drill through five layers of teaser components.
 */
export default function LockedOverlay({ label = "Unlock full report - £19.99" }: LockedOverlayProps) {
  const [busy, setBusy] = useState(false);

  const handleUnlock = useCallback(async () => {
    setBusy(true);
    try {
      const reportId = localStorage.getItem("solo_report_id") || undefined;
      await triggerStripeCheckout("price_report_oneoff", { report_id: reportId });
    } catch (err) {
      console.error("LockedOverlay checkout error:", err);
      setBusy(false);
    }
  }, []);

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md"
      style={{
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        background: "rgba(250,249,247,0.12)",
      }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-inset/80">
        <Lock className="h-5 w-5 text-muted-foreground/60" />
      </div>
      <Button
        size="sm"
        type="button"
        disabled={busy}
        className="rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-[hsl(var(--mint-hover))]"
        onClick={handleUnlock}
      >
        {busy ? "Redirecting..." : label}
      </Button>
    </div>
  );
}
