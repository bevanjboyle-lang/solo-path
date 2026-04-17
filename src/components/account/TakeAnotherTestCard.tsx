import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { claimSecondReport } from "@/lib/handlers";

type State =
  | { kind: "loading" }
  | { kind: "eligible_subscriber" }
  | { kind: "eligible_prepaid" }
  | { kind: "requires_payment" }
  | { kind: "cap_reached"; days: number }
  | { kind: "error" };

/**
 * "Take another test" composite card — fetches eligibility on mount,
 * renders one of three primary states. Uses the canonical `claimSecondReport`
 * handler for the action button.
 */
export default function TakeAnotherTestCard() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);

  // Probe eligibility on mount with a no-op call. Backend returns the
  // same shape whether we're claiming or just checking.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("claim-second-report", {
        body: { probe: true },
      });
      if (cancelled) return;
      if (error) {
        setState({ kind: "error" });
        return;
      }
      const r = (data || {}) as {
        eligible?: boolean;
        requires_payment?: boolean;
        reason?: string;
        days_until_eligible?: number;
        second_report_paid?: boolean;
        is_subscriber?: boolean;
      };

      if (r.reason === "cap_reached") {
        setState({ kind: "cap_reached", days: r.days_until_eligible ?? 30 });
      } else if (r.eligible && !r.requires_payment) {
        setState({
          kind: r.is_subscriber ? "eligible_subscriber" : "eligible_prepaid",
        });
      } else if (r.requires_payment) {
        setState({ kind: "requires_payment" });
      } else {
        setState({ kind: "requires_payment" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = async () => {
    setSubmitting(true);
    const result = await claimSecondReport(navigate);
    if (result.error) {
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }
    if (result.reason === "cap_reached") {
      setState({ kind: "cap_reached", days: result.days_until_eligible ?? 30 });
      setSubmitting(false);
      return;
    }
    // navigation/redirect handled in handler
  };

  const renderBody = () => {
    switch (state.kind) {
      case "loading":
        return (
          <p className="text-sm text-muted-foreground">
            <Loader2 className="inline h-3.5 w-3.5 animate-spin mr-2" />
            Checking…
          </p>
        );
      case "eligible_subscriber":
        return (
          <p className="text-sm text-muted-foreground">
            Start a new Plan B report and tracker. Your previous answers will be pre-filled where relevant. One new report every 30 days is included in your subscription.
          </p>
        );
      case "eligible_prepaid":
        return (
          <p className="text-sm text-muted-foreground">
            You've already paid for your second report. Start when you're ready.
          </p>
        );
      case "requires_payment":
        return (
          <p className="text-sm text-muted-foreground">
            Start a new Plan B report and tracker. A second report costs £9.99 — your previous answers will be pre-filled where relevant.
          </p>
        );
      case "cap_reached":
        return (
          <p className="text-sm text-muted-foreground">
            You've generated a report in the last 30 days. Your next one is available in {state.days} days.
          </p>
        );
      case "error":
        return (
          <p className="text-sm text-muted-foreground">
            We couldn't check eligibility. Refresh to try again.
          </p>
        );
    }
  };

  const renderButton = () => {
    if (state.kind === "loading" || state.kind === "error") return null;
    const disabled = state.kind === "cap_reached" || submitting;
    const label =
      state.kind === "requires_payment"
        ? "Pay £9.99 and start"
        : state.kind === "cap_reached"
          ? "Not yet available"
          : "Start new report";
    return (
      <Button size="sm" onClick={handleClick} disabled={disabled} className="mt-4">
        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : label}
      </Button>
    );
  };

  return (
    <Card className="border-border bg-[hsl(var(--surface-panel))]">
      <CardContent className="p-6">
        <h2 className="font-display text-base font-semibold text-foreground mb-3">
          Take another test
        </h2>
        {renderBody()}
        {renderButton()}
      </CardContent>
    </Card>
  );
}
