/*
 * PreSendBrief — Coaching layer Phase 4
 * (admin/coaching-layer-design.md v1.8 §4.1).
 *
 * Inline brief that surfaces on each Direct or Visibility task tile in
 * /plan §03, between the drafted-message reveal and the Mark-as-sent
 * affordance. Three blocks: realistic outcome distribution for this move
 * type, the smallest version of the action achievable in ten minutes,
 * and a 30-second pre-flight thought (yes / no / nothing).
 *
 * Content is STATIC at launch, keyed only by move_type. The design doc
 * explicitly says "synthetic at launch with honest footnote" because we
 * don't yet have cohort outcome data. A future iteration will swap in
 * archetype-specific real data sourced from cohort_aggregations. Until
 * then, the brief is the same for every Direct task and the same for
 * every Visibility task. Footnote at the bottom is honest about this.
 *
 * No LLM call. No backend. Instant render. Matches the design doc's UX
 * intent: "removes the cognitive load" of staring at the draft.
 *
 * Suppressed on tasks already in status 'sent' or 'completed' — the brief
 * is pre-send by definition. Suppressed on missed rows by the parent
 * (DayBody already gates that).
 */

interface Props {
  // KB-authoritative move type from the task. Only 'direct' and 'visibility'
  // tiles render this brief — Platform and Community moves have different
  // shapes and don't fit the "drafted message + send" frame.
  moveType: "direct" | "visibility";
}

interface BriefContent {
  outcome_distribution: string;
  smallest_version: string;
  pre_flight: {
    yes: string;
    no: string;
    nothing: string;
  };
}

const BRIEFS: Record<Props["moveType"], BriefContent> = {
  direct: {
    outcome_distribution:
      "Most first messages don't get a quick reply. A realistic baseline is one reply per ten messages sent. Most replies that come at all arrive within a week, often inside three days.",
    smallest_version:
      "If the draft feels long, cut it to three sentences: who you are in one line, the specific value you're offering, the single thing you're asking for. Save the full version for the next contact, where you can test whether the longer pitch lands better.",
    pre_flight: {
      yes: "Book a fifteen-minute call within the next week. Send the calendar link in your next message, don't ask them to suggest times.",
      no: "Thank them in one line. Ask if there's a colleague or contact they'd recommend you speak to instead. The referral ask converts at a higher rate than the original message.",
      nothing: "Plan to follow up at the five-day mark with a single line. Solo will surface the Catcher reminder when that time comes; you don't need to remember.",
    },
  },
  visibility: {
    outcome_distribution:
      "Most posts get few visible reactions. The signal that matters is who reads it silently: connection requests, profile views, and inbound DMs in the next few days. Don't measure success in likes or comments.",
    smallest_version:
      "If the draft feels long, cut it to one specific story or one specific claim. Save the broader frame for a follow-up post next week. Three short posts on a single thread of work outperform one long post.",
    pre_flight: {
      yes: "If a connection request comes in, accept it and send a short message within twenty-four hours, mentioning the post they engaged with.",
      no: "If you get a critical comment, respond once with a clarifying question, not a defence. If they double down, leave it. One critic doesn't mean the post failed.",
      nothing: "If the post gets no visible engagement, treat that as data, not failure. The audience may still have read it. Post again on the same thread within seven days to compound visibility.",
    },
  },
};

export default function PreSendBrief({ moveType }: Props) {
  const brief = BRIEFS[moveType];
  if (!brief) return null;

  return (
    <div className="mt-4 border border-border bg-transparent px-4 py-4">
      {/* Eyebrow */}
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3">
        <span className="inline-block w-1.5 h-1.5 bg-primary" />
        <span>Before you send</span>
      </div>

      {/* Block 1 — Outcome distribution */}
      <div className="mb-4">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-foreground/70 mb-1.5">
          What usually happens
        </div>
        <p className="text-[13.5px] leading-[1.55] text-foreground/90 max-w-[58ch]">
          {brief.outcome_distribution}
        </p>
      </div>

      {/* Block 2 — Smallest version */}
      <div className="mb-4">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-foreground/70 mb-1.5">
          Smallest version you can send in ten minutes
        </div>
        <p className="text-[13.5px] leading-[1.55] text-foreground/90 max-w-[58ch]">
          {brief.smallest_version}
        </p>
      </div>

      {/* Block 3 — Pre-flight thought (three sub-blocks) */}
      <div className="mb-3">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-foreground/70 mb-2">
          If they say…
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px] leading-[1.5] text-foreground/85 max-w-[60ch]">
          <dt className="font-semibold text-[#15735F]">Yes</dt>
          <dd>{brief.pre_flight.yes}</dd>
          <dt className="font-semibold text-foreground/70">No</dt>
          <dd>{brief.pre_flight.no}</dd>
          <dt className="font-semibold text-muted-foreground">Nothing</dt>
          <dd>{brief.pre_flight.nothing}</dd>
        </dl>
      </div>

      {/* Honest footnote — synthetic data at launch.
          Voice rule: no em-dashes, calm and factual. */}
      <p className="mt-3 pt-3 border-t border-border text-[10.5px] leading-[1.5] text-muted-foreground/70 max-w-[58ch]">
        These figures are the typical pattern at launch. As Solo accumulates real
        cohort data, this brief will become specific to your archetype.
      </p>
    </div>
  );
}
