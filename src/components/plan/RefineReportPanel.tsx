import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface RefineReportPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  refinementCount: number;
  onRefined: (updatedReport: unknown, newCount: number) => void;
  onLimitReached: () => void;
  onToast: (message: string) => void;
}

/**
 * RefineReportPanel — Sheet drawer for /plan report refinement.
 * Calls the existing `refine-report` edge function. CTA handler: submitRefinement.
 */
export default function RefineReportPanel({
  open,
  onOpenChange,
  reportId,
  refinementCount,
  onRefined,
  onLimitReached,
  onToast,
}: RefineReportPanelProps) {
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, 3 - refinementCount);

  const submitRefinement = async () => {
    if (!feedback.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("refine-report", {
        body: { report_id: reportId, feedback_text: feedback.trim() },
      });

      // 429 / limit-reached handling
      const status = (fnError as { context?: { status?: number } } | null)?.context?.status;
      if (status === 429 || data?.error === "limit_reached") {
        onLimitReached();
        onOpenChange(false);
        setFeedback("");
        return;
      }

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || "Refinement failed");

      const newCount = data.refinement_count ?? refinementCount + 1;
      onRefined(data.report, newCount);
      const newRemaining = Math.max(0, 3 - newCount);
      onToast(`Report refined. ${newRemaining} refinement${newRemaining !== 1 ? "s" : ""} remaining.`);
      setFeedback("");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Refine your report</SheetTitle>
          <SheetDescription>
            Describe what didn't feel right and we'll update the relevant sections.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={submitting}
            rows={4}
            placeholder="e.g. The options felt too similar to each other, or the sector listed doesn't match my experience."
            className="resize-y"
          />

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <p className="text-xs text-muted-foreground">
            You have {remaining} refinement{remaining !== 1 ? "s" : ""} remaining.
          </p>

          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => { if (!submitting) { setFeedback(""); setError(null); onOpenChange(false); } }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Cancel
            </button>
            <Button
              onClick={submitRefinement}
              disabled={submitting || !feedback.trim() || remaining <= 0}
              style={{ background: "#2ECDB0" }}
              className="text-white font-semibold border-0 hover:opacity-90 disabled:opacity-40 min-w-[140px]"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Refining...
                </span>
              ) : (
                "Send feedback"
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
