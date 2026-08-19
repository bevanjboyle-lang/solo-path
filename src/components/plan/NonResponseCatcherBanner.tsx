import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/*
 * NonResponseCatcherBanner — Coaching layer Phase 3 slice 3a
 * (admin/coaching-layer-design.md v1.6 §4.2).
 *
 * Renders any active Non-Response Catcher rows for the current user on /plan
 * above WeeklyFrictionReviewCard. One banner per row; banners stack when
 * multiple sent Direct moves have crossed the 5-day silence threshold.
 *
 * Visibility filter: action_taken IS NULL AND dismissed_at IS NULL.
 * Marks read_at on first render of each row (fire and forget; RLS UPDATE
 * policy permits user to mark their own catcher as read).
 *
 * Action handlers all write via direct supabase.update calls (V-072
 * UPDATE policy from the slice 2 migration). No new edge function:
 *  - Send follow-up → expand body in stone callout + Copy + "Logged as
 *    sent" button → action_taken='follow_up_sent'.
 *  - Try a different contact → scrolls to the Strands section + records
 *    action_taken='next_contact_tried'.
 *  - Move on → records action_taken='moved_on' AND calls
 *    mark-task-response with response_received=false so the underlying
 *    task tile shows the muted "No reply yet" pill.
 *  - Dismiss (×) → dismissed_at without action_taken.
 *
 * After any action, the banner fades by removing the row from local state.
 */

interface CatcherAction {
  id: "follow_up_sent" | "next_contact_tried" | "moved_on";
  label: string;
  description: string;
  body?: string | null;
}

interface CatcherContent {
  direct_address: string;
  actions: CatcherAction[];
  reframe: string;
}

interface CatcherRow {
  id: string;
  tracker_session_id: string;
  task_id: string;
  catcher_content: CatcherContent;
  dispatched_at: string;
  read_at: string | null;
}

interface Props {
  userId: string;
}

export default function NonResponseCatcherBanner({ userId }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<CatcherRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  // Tracks which row is showing the expanded follow-up draft (only one
  // expansion at a time keeps the surface calm even when multiple banners
  // are stacked).
  const [expandedFollowUpRowId, setExpandedFollowUpRowId] = useState<string | null>(null);
  // Per-row action in-flight so a click can't double-fire while the
  // network round-trip is pending.
  const [actionInFlightRowId, setActionInFlightRowId] = useState<string | null>(null);

  // Fetch active catcher rows for this user.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("non_response_catchers")
          .select(
            "id, tracker_session_id, task_id, catcher_content, dispatched_at, read_at",
          )
          .eq("user_id", userId)
          .is("action_taken", null)
          .is("dismissed_at", null)
          .order("dispatched_at", { ascending: true });

        if (cancelled) return;
        if (error) {
          console.error("NonResponseCatcherBanner fetch error:", error);
          setRows([]);
        } else {
          setRows((data as CatcherRow[]) ?? []);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("NonResponseCatcherBanner threw:", err);
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Mark read_at on each row that hasn't been read yet. Fire and forget;
  // RLS UPDATE policy permits the user to mark their own row.
  useEffect(() => {
    if (!rows || rows.length === 0) return;
    const unread = rows.filter((r) => !r.read_at);
    if (unread.length === 0) return;
    (async () => {
      try {
        const nowIso = new Date().toISOString();
        for (const r of unread) {
          const { error } = await supabase
            .from("non_response_catchers")
            .update({ read_at: nowIso })
            .eq("id", r.id);
          if (error) {
            console.error(
              `NonResponseCatcherBanner read_at update error for ${r.id}:`,
              error,
            );
          }
        }
      } catch (err) {
        console.error("NonResponseCatcherBanner read_at update threw:", err);
      }
    })();
  }, [rows]);

  const dropRowLocally = useCallback((rowId: string) => {
    setRows((prev) => (prev ? prev.filter((r) => r.id !== rowId) : prev));
    setExpandedFollowUpRowId((prev) => (prev === rowId ? null : prev));
  }, []);

  // Generic action recorder. Writes action_taken + action_taken_at via the
  // V-072 UPDATE policy, then drops the row locally on success.
  const recordAction = useCallback(
    async (
      rowId: string,
      actionId: CatcherAction["id"],
      successToast: string,
    ) => {
      if (actionInFlightRowId) return;
      setActionInFlightRowId(rowId);
      try {
        const { error } = await supabase
          .from("non_response_catchers")
          .update({
            action_taken: actionId,
            action_taken_at: new Date().toISOString(),
          })
          .eq("id", rowId);
        if (error) {
          console.error(
            `NonResponseCatcherBanner action ${actionId} error:`,
            error,
          );
          toast({
            title: "Couldn't log that",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
          return;
        }
        toast({ title: successToast });
        dropRowLocally(rowId);
      } finally {
        setActionInFlightRowId(null);
      }
    },
    [actionInFlightRowId, toast, dropRowLocally],
  );

  const handleFollowUpLogged = useCallback(
    (rowId: string) => {
      void recordAction(rowId, "follow_up_sent", "Follow-up logged.");
    },
    [recordAction],
  );

  const handleNextContact = useCallback(
    (rowId: string) => {
      // Scroll the user to the Strands section where the existing
      // "Find named contacts" Apollo affordance lives on each strand
      // (PlanSection / strand 04). v1 keeps this lightweight: the catcher
      // records its action; the user uses the existing finder UI from
      // there. A future iteration can deep-link to the exact strand.
      document
        .getElementById("plan-section-strands")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      void recordAction(rowId, "next_contact_tried", "Looking for another contact.");
    },
    [recordAction],
  );

  const handleMoveOn = useCallback(
    async (row: CatcherRow) => {
      if (actionInFlightRowId) return;
      setActionInFlightRowId(row.id);
      try {
        // Record the catcher action.
        const { error: catcherErr } = await supabase
          .from("non_response_catchers")
          .update({
            action_taken: "moved_on",
            action_taken_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (catcherErr) {
          console.error(
            "NonResponseCatcherBanner moved_on action error:",
            catcherErr,
          );
          toast({
            title: "Couldn't log that",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
          return;
        }

        // Also mark the underlying task as response_received=false so the
        // task tile in §03 shows the muted "No reply yet" pill — the
        // catcher's moved-on action and the per-task affordance are two
        // doors to the same fact.
        try {
          await supabase.functions.invoke("mark-task-response", {
            body: {
              tracker_session_id: row.tracker_session_id,
              task_id: row.task_id,
              response_received: false,
            },
          });
        } catch (err) {
          console.warn(
            "NonResponseCatcherBanner mark-task-response companion call failed (catcher row still logged):",
            err,
          );
        }

        toast({ title: "Logged as moved on, no setback." });
        dropRowLocally(row.id);
      } finally {
        setActionInFlightRowId(null);
      }
    },
    [actionInFlightRowId, toast, dropRowLocally],
  );

  const handleDismiss = useCallback(
    async (rowId: string) => {
      if (actionInFlightRowId) return;
      setActionInFlightRowId(rowId);
      try {
        const { error } = await supabase
          .from("non_response_catchers")
          .update({ dismissed_at: new Date().toISOString() })
          .eq("id", rowId);
        if (error) {
          console.error("NonResponseCatcherBanner dismiss error:", error);
          toast({
            title: "Couldn't dismiss that",
            variant: "destructive",
          });
          return;
        }
        dropRowLocally(rowId);
      } finally {
        setActionInFlightRowId(null);
      }
    },
    [actionInFlightRowId, toast, dropRowLocally],
  );

  const handleCopyDraft = useCallback(
    async (body: string) => {
      try {
        await navigator.clipboard.writeText(body);
        toast({ title: "Copied to clipboard." });
      } catch (err) {
        console.error("Catcher follow-up copy failed:", err);
        toast({
          title: "Couldn't copy",
          description: "Please select and copy manually.",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  if (loading || !rows || rows.length === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-4">
      {rows.map((row) => {
        const c = row.catcher_content;
        const followUp = c.actions.find((a) => a.id === "follow_up_sent");
        const nextContact = c.actions.find((a) => a.id === "next_contact_tried");
        const moveOn = c.actions.find((a) => a.id === "moved_on");
        const isExpanded = expandedFollowUpRowId === row.id;
        const isInFlight = actionInFlightRowId === row.id;

        return (
          <section
            key={row.id}
            className="border-t border-border pt-6 pb-7 relative"
          >
            {/* Dismiss × — top-right, quiet */}
            <button
              type="button"
              onClick={() => handleDismiss(row.id)}
              disabled={isInFlight}
              aria-label="Dismiss this Catcher"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 inline-flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-[#F3F1ED] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span aria-hidden="true" className="text-[16px] leading-none">×</span>
            </button>

            {/* Eyebrow — mint dot + label */}
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5 flex-wrap">
              <span className="inline-block w-1.5 h-1.5 bg-primary" />
              <span className="text-foreground">About that message</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-muted-foreground">Five days on</span>
            </div>

            {/* Direct address — H3 weight, the line that lands */}
            <h3
              className="font-display text-[20px] sm:text-[22px] lg:text-[24px] font-bold tracking-tight leading-[1.25] text-foreground max-w-[58ch]"
              style={{ letterSpacing: "-0.018em" }}
            >
              {c.direct_address}
            </h3>

            {/* Reframe — display weight, muted-ish, sits beneath the H3 */}
            <p
              className="mt-4 text-[14.5px] sm:text-[15px] text-foreground/85 leading-[1.55] max-w-[58ch]"
              style={{ letterSpacing: "-0.008em" }}
            >
              {c.reframe}
            </p>

            {/* Action stack — three buttons in design-doc order */}
            <div className="mt-6 pt-5 border-t border-border">
              <div className="flex flex-wrap items-center gap-2">
                {followUp && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedFollowUpRowId(isExpanded ? null : row.id)
                    }
                    disabled={isInFlight}
                    className="inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isExpanded ? "Hide the draft" : followUp.label}
                  </button>
                )}
                {nextContact && (
                  <button
                    type="button"
                    onClick={() => handleNextContact(row.id)}
                    disabled={isInFlight}
                    className="inline-flex items-center gap-1.5 border border-border bg-transparent px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:border-foreground hover:bg-[#F3F1ED] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {nextContact.label}
                  </button>
                )}
                {moveOn && (
                  <button
                    type="button"
                    onClick={() => handleMoveOn(row)}
                    disabled={isInFlight}
                    className="inline-flex items-center gap-1.5 border border-border bg-transparent px-3 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground hover:border-foreground hover:bg-[#F3F1ED] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {moveOn.label}
                  </button>
                )}
              </div>

              {/* Action descriptions — small, muted, sits below the buttons.
                  Reads in the same order as the buttons so the user can
                  scan which action goes with which framing. */}
              <ul className="mt-4 space-y-1.5 text-[12.5px] leading-[1.5] text-muted-foreground max-w-[60ch]">
                {followUp && <li>· {followUp.description}</li>}
                {nextContact && <li>· {nextContact.description}</li>}
                {moveOn && <li>· {moveOn.description}</li>}
              </ul>
            </div>

            {/* Follow-up draft expansion — appears when Send-follow-up clicked.
                Stone callout with the draft body, Copy button, and
                "Logged as sent" confirmation that records action_taken. */}
            {isExpanded && followUp?.body && (
              <div className="mt-5 border border-border bg-[#F7F5F0] px-4 py-3.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                  Draft follow-up
                </div>
                <p className="text-[14px] leading-[1.55] text-foreground whitespace-pre-line max-w-[58ch]">
                  {followUp.body}
                </p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCopyDraft(followUp.body ?? "")}
                    disabled={isInFlight}
                    className="inline-flex items-center gap-1.5 border border-border bg-transparent px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:border-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFollowUpLogged(row.id)}
                    disabled={isInFlight}
                    className="inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isInFlight ? "Logging…" : "Logged as sent"}
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
