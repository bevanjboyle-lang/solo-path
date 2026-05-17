import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";

interface CheckInPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
  dayNumber?: number;
  readOnly?: boolean;
  /**
   * v39 (Gap 2, 2026-05-17): true when the panel was opened for a missed
   * past day. Changes the title and subhead so the user knows they're
   * backfilling, not checking in for today. Submission semantics are the
   * same as a today check-in; the server handles the date-vs-day routing.
   */
  isBackfill?: boolean;
  /**
   * F87 (2026-05-07): onSubmit now returns the AI's closing message so the panel
   * can render it inline before the user dismisses. Returning null/undefined falls
   * back to a generic "check-in saved" line.
   */
  onSubmit?: (response: string) => Promise<string | null>;
}

type Exchange = {
  role: "user" | "assistant";
  message: string;
  timestamp?: string;
};

export default function CheckInPanel({
  open,
  onOpenChange,
  sessionId,
  dayNumber,
  readOnly = false,
  isBackfill = false,
  onSubmit,
}: CheckInPanelProps) {
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // F87: hold the AI's reply so we can show it after submit, before the user
  // dismisses the drawer. Cleared whenever the drawer reopens for a fresh check-in.
  const [aiReply, setAiReply] = useState<string | null>(null);

  // v39 (Gap 2, 2026-05-17): read-only viewer state. When opened for a
  // completed past day, fetch the row from checkin_history and render the
  // exchanges transcript instead of the input form.
  const [readOnlyLoading, setReadOnlyLoading] = useState(false);
  const [readOnlyExchanges, setReadOnlyExchanges] = useState<Exchange[] | null>(null);
  const [readOnlyError, setReadOnlyError] = useState<string | null>(null);

  // Reset state when the drawer reopens fresh.
  useEffect(() => {
    if (open) {
      setAiReply(null);
      setResponse("");
      setReadOnlyExchanges(null);
      setReadOnlyError(null);
    }
  }, [open]);

  // v39 (Gap 2): fetch past check-in content when opened in read-only mode.
  // Keyed on (session, day_number) per the new UNIQUE constraint.
  useEffect(() => {
    if (!open || !readOnly || !sessionId || !dayNumber) return;
    let cancelled = false;
    setReadOnlyLoading(true);
    setReadOnlyError(null);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("checkin_history")
          .select("exchanges")
          .eq("tracker_session_id", sessionId)
          .eq("day_number", dayNumber)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setReadOnlyError("Couldn't load this check-in. Try again later.");
        } else if (!data) {
          setReadOnlyError("No check-in recorded for this day.");
        } else {
          const raw = (data as { exchanges?: unknown }).exchanges;
          if (Array.isArray(raw)) {
            setReadOnlyExchanges(raw as Exchange[]);
          } else {
            setReadOnlyExchanges([]);
          }
        }
      } catch {
        if (!cancelled) {
          setReadOnlyError("Couldn't load this check-in. Try again later.");
        }
      } finally {
        if (!cancelled) setReadOnlyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, readOnly, sessionId, dayNumber]);

  const handleSubmit = async () => {
    if (!response.trim() || !onSubmit) return;
    setSubmitting(true);
    try {
      const reply = await onSubmit(response);
      // Show the AI's contextual reply inline. If the backend didn't return one,
      // fall back to a clear confirmation so the panel still gives an explicit close.
      setAiReply(reply || "Check-in saved. See you tomorrow.");
    } catch (err) {
      console.error("Check-in submit error:", err);
      setAiReply("Something went wrong saving your check-in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    onOpenChange(false);
  };

  // v39 (Gap 2): title + subhead vary by mode.
  const dayLabel = dayNumber ? `Day ${dayNumber}` : "Day";
  const title = readOnly
    ? `${dayLabel} — what you logged`
    : isBackfill
      ? `Backfill ${dayLabel}`
      : `${dayLabel} check-in`;
  const inputSubhead = isBackfill
    ? `Tell us what happened on ${dayLabel.toLowerCase()} — what got done, what didn't.`
    : "What did you do today? What's blocking you?";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-lg p-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-lg font-semibold text-foreground">
              {title}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              {readOnly
                ? "This check-in is locked — submitted check-ins can't be edited."
                : aiReply
                  ? "Here's what's been recorded."
                  : inputSubhead}
            </DrawerDescription>
          </DrawerHeader>

          <div className="mt-4 space-y-4">
            {readOnly ? (
              // v39 (Gap 2): read-only transcript view. Shows the full exchanges
              // for this day's check-in, alternating user vs assistant.
              <div className="rounded-lg border border-border bg-[hsl(var(--surface-inset))] p-4 max-h-[55vh] overflow-y-auto">
                {readOnlyLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading check-in…
                  </div>
                ) : readOnlyError ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {readOnlyError}
                  </p>
                ) : readOnlyExchanges && readOnlyExchanges.length > 0 ? (
                  <div className="space-y-3">
                    {readOnlyExchanges.map((ex, i) => {
                      const isUser = ex.role === "user";
                      return (
                        <div key={i} className="space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            {isUser ? "You" : "Solo"}
                          </div>
                          <p
                            className={`text-sm leading-relaxed whitespace-pre-wrap ${
                              isUser ? "text-foreground" : "text-foreground/85"
                            }`}
                          >
                            {ex.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    This check-in has no recorded exchanges.
                  </p>
                )}
                <div className="mt-4 flex">
                  <Button
                    variant="ghost"
                    onClick={handleDone}
                    className="text-sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : aiReply ? (
              <>
                {/* F87: AI's closing message rendered inline. */}
                <div className="rounded-lg border border-primary/30 bg-[hsl(var(--surface-mint-tint))] p-4">
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {aiReply}
                  </p>
                </div>
                <div className="flex">
                  <Button
                    onClick={handleDone}
                    className="rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder={isBackfill ? "Two minutes. What happened?" : "Two minutes. Be honest."}
                  className="min-h-[120px] resize-none bg-[hsl(var(--surface-panel))] text-sm"
                  disabled={submitting}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={!response.trim() || submitting}
                    className="rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : isBackfill ? (
                      "Submit backfill"
                    ) : (
                      "Submit check-in"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    disabled={submitting}
                    className="text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
