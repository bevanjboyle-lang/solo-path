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
  // Pass 2 (2026-05-18): hold the submitted-on date for the readOnly foot.
  // Per the decisions doc, we surface a light document-metadata line ("Submitted
  // on 07 May") but NOT the time-of-day or exchange count.
  const [readOnlyDate, setReadOnlyDate] = useState<string | null>(null);

  // Reset state when the drawer reopens fresh.
  useEffect(() => {
    if (open) {
      setAiReply(null);
      setResponse("");
      setReadOnlyExchanges(null);
      setReadOnlyError(null);
      setReadOnlyDate(null);
    }
  }, [open]);

  // v39 (Gap 2): fetch past check-in content when opened in read-only mode.
  // Keyed on (session, day_number) per the new UNIQUE constraint.
  // Pass 2 (2026-05-18): also pull checkin_date for the foot's "Submitted on" line.
  useEffect(() => {
    if (!open || !readOnly || !sessionId || !dayNumber) return;
    let cancelled = false;
    setReadOnlyLoading(true);
    setReadOnlyError(null);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("checkin_history")
          .select("exchanges, checkin_date")
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
          const rawDate = (data as { checkin_date?: string }).checkin_date;
          if (rawDate) {
            // Format as "07 May", light document metadata, no time, no year.
            try {
              const d = new Date(rawDate + "T00:00:00Z");
              setReadOnlyDate(
                d.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  timeZone: "UTC",
                }),
              );
            } catch {
              setReadOnlyDate(null);
            }
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
    ? `${dayLabel}, what you logged`
    : isBackfill
      ? `Backfill ${dayLabel}`
      : `${dayLabel} check-in`;
  const inputSubhead = isBackfill
    ? `Tell us what happened on ${dayLabel.toLowerCase()}, what got done, what didn't.`
    : "What did you do today? What's blocking you?";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-lg p-6">
          <DrawerHeader className="px-0">
            {/* Pass 2 (2026-05-18, lift-in): "Locked" pill in the readOnly
              * header. Honest disambiguation that the state is intentional and
              * immutable, not a missing edit affordance. */}
            <div className="flex items-baseline justify-between gap-3">
              <DrawerTitle className="text-lg font-semibold text-foreground">
                {title}
              </DrawerTitle>
              {readOnly && (
                <span
                  className="inline-flex items-center px-2 py-[2px] text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground border border-border"
                >
                  Locked
                </span>
              )}
            </div>
            <DrawerDescription className="text-sm text-muted-foreground">
              {readOnly
                ? "This check-in is locked, submitted check-ins can't be edited."
                : aiReply
                  ? "Here's what's been recorded."
                  : inputSubhead}
            </DrawerDescription>
          </DrawerHeader>

          <div className="mt-4 space-y-4">
            {readOnly ? (
              // v39 (Gap 2): read-only transcript view. Shows the full exchanges
              // for this day's check-in, alternating user vs assistant.
              // Pass 2 (2026-05-18): sender dots + Source Serif 4 for Solo text
              // (mirrors /ask-solo's vocabulary so the user reads "this is the
              // same kind of conversation, frozen as a record"). User text stays
              // in display 500, direct voice. Foot strip shows just "Submitted
              // on DD MMM", no time, no exchange count.
              <div className="border border-border bg-[hsl(var(--surface-inset))] p-4 max-h-[55vh] overflow-y-auto">
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
                  <div className="divide-y divide-border">
                    {readOnlyExchanges.map((ex, i) => {
                      const isUser = ex.role === "user";
                      return (
                        <div key={i} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                          <div
                            className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] ${
                              isUser ? "text-muted-foreground" : "text-[#15735F]"
                            }`}
                          >
                            <span
                              className="inline-block w-[5px] h-[5px]"
                              style={{ background: isUser ? "#7A7670" : "#2ECDB0" }}
                              aria-hidden="true"
                            />
                            {isUser ? "You" : "Solo"}
                          </div>
                          {isUser ? (
                            <p
                              className="font-display text-[14px] font-medium text-foreground leading-relaxed whitespace-pre-wrap"
                              style={{ letterSpacing: "-0.005em" }}
                            >
                              {ex.message}
                            </p>
                          ) : (
                            <p
                              className="text-[14px] text-foreground/85 leading-[1.6] whitespace-pre-wrap"
                              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                            >
                              {ex.message}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    This check-in has no recorded exchanges.
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-border flex items-baseline justify-between gap-3">
                  <Button
                    variant="ghost"
                    onClick={handleDone}
                    className="text-sm"
                  >
                    Close
                  </Button>
                  {readOnlyDate && (
                    <span className="text-[10px] tracking-[0.06em] text-muted-foreground">
                      Submitted on {readOnlyDate}
                    </span>
                  )}
                </div>
              </div>
            ) : aiReply ? (
              <>
                {/* F87: AI's closing message rendered inline. */}
                <div className="border border-primary/30 bg-[hsl(var(--surface-mint-tint))] p-4">
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {aiReply}
                  </p>
                </div>
                <div className="flex">
                  <Button
                    onClick={handleDone}
                    className="bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
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
                {/* Pass 2 (2026-05-18, lift-in): backfill hint copy names the
                  * spec's hard rule before the user commits. The same instinct
                  * as /questionnaire's refusal-modal warning copy. Suppressed
                  * on today mode. */}
                {isBackfill && dayNumber && (
                  <p className="text-[11.5px] text-muted-foreground leading-snug">
                    Backfilling Day {dayNumber} won't change today's tracker
                    state, it just fills the gap in your record.
                  </p>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={!response.trim() || submitting}
                    className="bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
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
