import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/*
 * WeeklyFrictionReviewCard — Phase 2 slice 2 of the coaching layer
 * (admin/coaching-layer-design.md v1.3 §4.3).
 *
 * Renders the user's latest Weekly Friction Review at the top of /plan
 * when one exists for the current week. Marks read_at on first render so
 * the "new" affordance can fade after the first view (kept passive for
 * MVP — no badge change, no collapse-after-read; iterate later if useful).
 *
 * Layout choice: lives ABOVE TodayCard but BELOW the page title card and
 * any pre-conditions (strand selector, plan-building, replan). It is the
 * top-of-page weekly artefact when present; TodayCard remains the daily
 * action immediately below.
 *
 * Visual: panel-ivory full-width, generous padding, mint eyebrow dot. Four
 * fields rendered as editorial blocks rather than form labels. The
 * dominant_pattern is the punchy H3 — it's the single sharpest line.
 * Week summary appears below as muted context. Reframe in display weight
 * (the line meant to land). Action with a small-caps "This week" label.
 *
 * Self-contained: own data fetch (latest review where today is between
 * week_start and week_end), own read_at marking, own loading state. Pass
 * in only the user id.
 */

interface ReviewRow {
  id: string;
  week_start: string;
  week_end: string;
  generated_at: string;
  read_at: string | null;
  review_content: {
    week_summary: string;
    dominant_pattern: string;
    reframe: string;
    next_week_action: string;
    cohort_pulse?: string | null;
  };
}

interface Props {
  userId: string;
}

export default function WeeklyFrictionReviewCard({ userId }: Props) {
  const [review, setReview] = useState<ReviewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch the current week's review for this user, if one exists.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);

    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("weekly_friction_reviews")
          .select(
            "id, week_start, week_end, generated_at, read_at, review_content",
          )
          .eq("user_id", userId)
          .lte("week_start", today)
          .gte("week_end", today)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (fetchError) {
          console.error("WeeklyFrictionReviewCard fetch error:", fetchError);
          setError(true);
        } else {
          setReview(data as ReviewRow | null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("WeeklyFrictionReviewCard threw:", err);
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Mark read_at once we've loaded a review and it isn't already read.
  // Fire-and-forget; user shouldn't wait. RLS policy permits the user to
  // update their own row.
  useEffect(() => {
    if (!review || review.read_at) return;
    const id = review.id;
    (async () => {
      try {
        const { error: updateError } = await supabase
          .from("weekly_friction_reviews")
          .update({ read_at: new Date().toISOString() })
          .eq("id", id);
        if (updateError) {
          console.error("WeeklyFrictionReviewCard read_at update error:", updateError);
        }
      } catch (err) {
        console.error("WeeklyFrictionReviewCard read_at update threw:", err);
      }
    })();
  }, [review]);

  // Hide entirely while loading, on error, or when there is no review for
  // this week. The card simply doesn't appear — it isn't a structural part
  // of /plan, it's a weekly-appearing artefact.
  if (loading || error || !review) return null;

  const { review_content: r, generated_at, week_start, week_end } = review;

  // Format date range for the eyebrow: "12 May – 18 May".
  const dateRange = (() => {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return `${fmt(week_start)} – ${fmt(week_end)}`;
  })();

  return (
    <section className="border-t border-border pt-6 pb-8 mb-6">
      {/* Eyebrow — mint dot + label + date range */}
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5 flex-wrap">
        <span className="inline-block w-1.5 h-1.5 bg-primary" />
        <span className="text-foreground">This week</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground">Friction review</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground normal-case tracking-normal text-[11px] font-normal">
          {dateRange}
        </span>
      </div>

      {/* Dominant pattern as the punchy H3 — the single sharpest line */}
      <h3
        className="font-display text-[22px] sm:text-[26px] lg:text-[28px] font-bold tracking-tight leading-[1.2] text-foreground max-w-[58ch]"
        style={{ letterSpacing: "-0.018em" }}
      >
        {r.dominant_pattern}
      </h3>

      {/* Week summary — muted, sits under the H3 as factual context */}
      <p className="mt-3 text-[13.5px] text-muted-foreground leading-[1.55] max-w-[60ch]">
        {r.week_summary}
      </p>

      {/* Reframe — display weight, the line meant to land */}
      <p
        className="mt-7 font-display text-[16px] sm:text-[17px] font-medium text-foreground leading-[1.5] max-w-[58ch]"
        style={{ letterSpacing: "-0.012em" }}
      >
        {r.reframe}
      </p>

      {/* Next week action — small-caps label + body text */}
      <div className="mt-7 pt-5 border-t border-border">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="inline-block w-1.5 h-1.5 bg-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#15735F]">
            This week
          </span>
        </div>
        <p className="text-[14.5px] sm:text-[15px] text-foreground/90 leading-[1.6] max-w-[60ch]">
          {r.next_week_action}
        </p>
      </div>

      {/* Cohort pulse — Phase 5a (admin/coaching-layer-design.md v1.9 §4.5).
        * Qualitative-only anchor: "most people in your cohort do X". The
        * prompt is forbidden from inventing numbers and the validator
        * rejects digits, so any line that lands here is non-quantitative
        * by construction. Honest footnote names the synthetic-at-launch
        * data sourcing.
        * Suppressed cleanly if the row predates v3 of the prompt (older
        * rows have no cohort_pulse field). */}
      {r.cohort_pulse && (
        <div className="mt-6 pt-5 border-t border-border">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="inline-block w-1.5 h-1.5 bg-muted-foreground/60" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Cohort pulse
            </span>
          </div>
          <p className="text-[14px] sm:text-[14.5px] text-foreground/85 leading-[1.6] max-w-[60ch] italic">
            {r.cohort_pulse}
          </p>
          <p className="mt-2 text-[10.5px] leading-[1.5] text-muted-foreground max-w-[58ch]">
            Qualitative at launch. As Solo accumulates real cohort data, this
            line will become quantitative and specific to your archetype.
          </p>
        </div>
      )}

      {/* Generated-at footnote — tiny, muted, for transparency */}
      <div className="mt-6 pt-4 border-t border-border text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Generated{" "}
        {new Date(generated_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </div>
    </section>
  );
}
