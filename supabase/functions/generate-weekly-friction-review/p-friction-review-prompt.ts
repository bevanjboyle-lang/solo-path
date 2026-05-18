/*
 * p-friction-review-prompt v1 — 2026-05-18
 *
 * Weekly Friction Review prompt (Phase 2 of the coaching layer).
 * See admin/coaching-layer-design.md v1.2 §4.3 for the design context,
 * §5 for the voice rules, and branding/tone-of-voice.md for the
 * canonical voice contract.
 *
 * This module exports:
 *   - PROMPT_VERSION (stamped into every generated review for QA)
 *   - buildFrictionReviewPrompt(input) → { system, user } messages
 *   - REVIEW_RESPONSE_SCHEMA (the strict JSON schema we ask for)
 *   - validateReviewOutput(output) → { ok, errors }
 *
 * Voice rules baked into the system prompt (NEVER drift from these):
 *   1. Name the friction precisely with the user's own logged words.
 *   2. Normalise with data ("3 of 5 moves"), not abstract reassurance.
 *   3. Give ONE specific action. Not three. Not a framework. One move.
 *   4. Never tell the user how they feel.
 *   5. Never use the banned vocabulary (tone-of-voice.md §What to avoid).
 *   6. The character is a working coach (someone in your corner who tells
 *      you the truth about your form), NEVER a life coach.
 *
 * Input contract (built by the edge function from real Supabase data):
 *   - archetype label (free text, e.g., "AI Strategy & Implementation Advisor")
 *   - current_day (1–30+ for one-time, rolling for subscriber)
 *   - plan_length (30 for one-time, "rolling" for subscriber)
 *   - days: array of last 7 days, each with date, state, narrative,
 *     plan_updates[]
 *   - replan_summary: optional summary of any replan that fired
 *   - active_strands: array of currently active strands (names only)
 */

export const PROMPT_VERSION = "p-friction-review-v3-2026-05-18";

export interface FrictionReviewDay {
  date: string; // YYYY-MM-DD
  state: "on_track" | "drifting" | "significantly_behind" | "no_checkin";
  narrative: string | null; // checkin_history.narrative_addition
  plan_updates: Array<{
    task_id: string;
    new_status: "completed" | "missed" | "moved" | "sent";
    notes: string | null;
  }>;
}

export interface FrictionReviewInput {
  archetype: string;
  current_day: number;
  plan_length: string; // "30" or "rolling"
  days: FrictionReviewDay[]; // last 7 days, oldest first
  replan_summary: string | null; // null if no replan fired this week
  active_strands: string[]; // strand model_names
}

export interface FrictionReviewOutput {
  week_summary: string;
  dominant_pattern: string;
  reframe: string;
  next_week_action: string;
  // Phase 5a (2026-05-18): cohort_pulse is now REQUIRED. Qualitative only
  // until cohort_aggregations is populated with real data; the prompt
  // enforces "no numbers" and the validator rejects numeric leakage.
  cohort_pulse: string;
}

export const REVIEW_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["week_summary", "dominant_pattern", "reframe", "next_week_action", "cohort_pulse"],
  properties: {
    week_summary: {
      type: "string",
      description:
        "ONE sentence stating what actually happened this week, in factual " +
        "terms using the user's own numbers (e.g., 'You completed 4 of 8 " +
        "planned tasks and missed your last two check-ins.'). No commentary, " +
        "no judgement, no encouragement. Numbers and named tasks only.",
      minLength: 20,
      maxLength: 240,
    },
    dominant_pattern: {
      type: "string",
      description:
        "ONE sentence naming the single dominant behavioural pattern Solo " +
        "detects from the data. Use the user's own logged words where they " +
        "appear in plan_updates.notes or narrative (e.g., 'You logged " +
        "\"doesn\\'t feel ready yet\" on three of five moves.'). Do not " +
        "tell the user how they feel. Do not generalise to all users. State " +
        "what the data says about this user this week.",
      minLength: 30,
      maxLength: 280,
    },
    reframe: {
      type: "string",
      description:
        "ONE to TWO sentences offering a specific reframe of the dominant " +
        "pattern. Reframe = a sharper way to think about the friction, not " +
        "reassurance. Calm and direct. NEVER use abstract reassurance " +
        "('don't worry', 'it's okay', 'you've got this'). NEVER use banned " +
        "vocabulary (unlock, transform, journey, etc.). Example: 'That's " +
        "the pattern. Ready was always going to be a fiction — the move " +
        "happens before you feel ready, not after.'",
      minLength: 30,
      maxLength: 320,
    },
    next_week_action: {
      type: "string",
      description:
        "ONE to TWO sentences naming ONE specific action for the coming " +
        "week. Specific = concrete, observable, completable within one day. " +
        "NOT a framework, NOT a list of options, NOT 'try to'. A single " +
        "move. Example: 'This week, the next time you reach for the \"not " +
        "ready\" button, spend ninety seconds writing the worst possible " +
        "version of the message and send that one.'",
      minLength: 30,
      maxLength: 360,
    },
    cohort_pulse: {
      type: "string",
      description:
        "ONE to TWO sentences anchoring this user's experience in their " +
        "cohort. QUALITATIVE ONLY — no numbers, no percentages, no counts. " +
        "Real cohort data does not exist yet at launch, so any specific " +
        "number would be invented. Reframe the user's friction or pattern " +
        "as something shared by their cohort. Acceptable shapes: 'Most " +
        "people in your cohort skipped at least one move last week; the " +
        "state you logged is the state most of them logged.' or 'The " +
        "pattern you are noticing this week is the same pattern most " +
        "people on this archetype track through weeks two and three.' " +
        "Never invent statistics. Never say 'X others' or 'Y percent'. " +
        "Never name specific cohort sizes.",
      minLength: 30,
      maxLength: 280,
    },
  },
} as const;

/**
 * buildFrictionReviewPrompt — produces the system + user messages for
 * the OpenAI call. Returns OpenAI-shaped messages array ready to pass to
 * chat.completions.create with response_format json_schema.
 */
export function buildFrictionReviewPrompt(input: FrictionReviewInput) {
  return {
    messages: [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: formatUserPrompt(input) },
    ],
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: "friction_review",
        strict: true,
        schema: REVIEW_RESPONSE_SCHEMA,
      },
    },
  };
}

/**
 * validateReviewOutput — runtime check on the AI's response. Belt and
 * braces in addition to the strict json_schema response_format. Returns
 * { ok: true } or { ok: false, errors: string[] }.
 */
export function validateReviewOutput(
  output: unknown,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (typeof output !== "object" || output === null) {
    return { ok: false, errors: ["output is not an object"] };
  }
  const o = output as Record<string, unknown>;
  const requiredStrings = [
    "week_summary",
    "dominant_pattern",
    "reframe",
    "next_week_action",
    "cohort_pulse",
  ] as const;
  for (const key of requiredStrings) {
    const value = o[key];
    if (typeof value !== "string") {
      errors.push(`${key} missing or not a string`);
      continue;
    }
    if (value.length < 20) {
      errors.push(`${key} too short (${value.length} chars)`);
    }
    // Banned-word check on the user-facing strings.
    const lower = value.toLowerCase();
    for (const banned of BANNED_WORDS) {
      // word-boundary match to avoid false positives (e.g. "unlock" in URL)
      const re = new RegExp(`\\b${banned}\\b`, "i");
      if (re.test(lower)) {
        errors.push(
          `${key} contains banned word "${banned}" — voice rule violation`,
        );
      }
    }
  }

  // Phase 5a cohort_pulse-specific check: reject any digit OR percent OR
  // spelled-out number in the cohort pulse line. Real cohort data does
  // not exist yet; the prompt is told to stay qualitative, but the LLM
  // sometimes leaks numbers anyway and they would mislead the user.
  // Exception: ordinal week references like "weeks two and three" are OK
  // because they refer to the plan timeline, not cohort sizes — they
  // would only trip the spelled-out-number regex if we listed plan-time
  // words. Solution: regex catches digit / percent / "N percent" / counts
  // like "23 others" but NOT bare ordinals when they appear in plan-time
  // context. Keep this simple: any digit at all OR any of a small set of
  // "N people / N percent / N others" spelled-out patterns triggers.
  const cohortPulse = o.cohort_pulse;
  if (typeof cohortPulse === "string") {
    if (/\d/.test(cohortPulse)) {
      errors.push(
        "cohort_pulse contains a digit — qualitative-only rule violated",
      );
    }
    if (/\bpercent\b|\bpercentage\b|\b%\b/i.test(cohortPulse)) {
      errors.push(
        "cohort_pulse mentions percent / percentage — qualitative-only rule violated",
      );
    }
    if (
      /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\s+(other|others|people|users|members|of|percent)\b/i
        .test(cohortPulse)
    ) {
      errors.push(
        "cohort_pulse uses a spelled-out cohort count — qualitative-only rule violated",
      );
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
}

/* ─────────────────────────── Internal ─────────────────────────── */

const BANNED_WORDS = [
  "unlock",
  "unleash",
  "supercharge",
  "transform",
  "game-changing",
  "revolutionary",
  "empower",
  "synergy",
  "ecosystem",
  "seamless",
  "journey",
  "hustle",
  "grind",
  "amazing",
  "incredible",
  "exciting",
  "thrilled",
  "delighted",
  "fantastic",
  "comprehensive",
  "holistic",
  "best-in-class",
  "world-class",
  "cutting-edge",
];

const SYSTEM_PROMPT = `You are Solo's working coach.

Your single job: read one week of a Solo user's actual check-in data and produce a Weekly Friction Review. The review is delivered Monday morning by email and rendered on the user's /plan surface.

CRITICAL VOICE CONTRACT
You speak like a commercially literate peer who has thought seriously about this user's situation. Not a life coach. Not a chatbot. Not a startup accelerator. You are in their corner and you tell them the truth about their form.

Apply these rules without exception:

1. Name the friction precisely with the user's own logged words. If the data shows them writing "doesn't feel ready yet" three times, use that exact phrase, do not paraphrase to "you've been feeling hesitant".

2. Normalise with data, never with reassurance. Use the numbers. "Most first messages don't get a quick reply" is correct. "Don't worry about it" is not.

3. Give exactly ONE specific action for next week. Specific means observable, concrete, completable within a day. Not a framework. Not three options. One move.

4. Never tell the user how they feel. Describe what they did. "You logged 'overwhelmed' twice" is correct. "You're feeling overwhelmed" is not.

5. Never use these banned words or phrases: unlock, unleash, supercharge, transform, game-changing, revolutionary, empower, synergy, ecosystem, seamless, journey, hustle, grind, amazing, incredible, exciting, thrilled, delighted, fantastic, comprehensive, holistic, best-in-class, world-class, cutting-edge.

6. Never use exclamation marks.

7. Never use abstract reassurance phrases: "don't worry", "it's okay to", "you've got this", "you're doing great", "be kind to yourself", "give yourself permission". The user is a mid-career professional. They find this insulting.

8. The reframe is a sharper way to think about the friction, not validation. The reframe should land slightly uncomfortable — the kind of thing a sharp friend would say that makes you go "huh, you're right".

OUTPUT STRUCTURE

Return JSON matching the supplied schema. Five required fields:

- week_summary: ONE sentence stating what actually happened, in numbers. No commentary.
- dominant_pattern: ONE sentence naming the single dominant behavioural pattern from the data. Use the user's own logged words.
- reframe: ONE to TWO sentences offering a sharper way to think about the pattern.
- next_week_action: ONE to TWO sentences naming exactly ONE specific action for the coming week.
- cohort_pulse: ONE to TWO sentences anchoring this user in their cohort. See the COHORT PULSE section below for the strict rules.

COHORT PULSE — STRICT RULES (no exceptions)

The cohort_pulse is a small anchoring line that locates this user in their peer population. It reduces the loneliness of the journey by naming that their experience is shared.

The hard constraint: real cohort data does not exist yet at launch. Any specific number you invent would mislead the user. So:

- NEVER use numbers. No "23 others", no "60 percent", no "third-most-pursued".
- NEVER cite a specific cohort size or count.
- NEVER cite a specific outcome rate.
- Qualitative framing only: "most people", "people on this archetype", "people in your cohort", "the typical pattern at weeks 2-3", "what most of them logged".
- Tie the pulse to the user's actual data this week. The line should feel earned by what they did, not generic.
- Calm, factual, normalising. Same voice contract as the rest of the review.

Example shapes (do not copy verbatim — adapt to this user's data):
- "Most people in your cohort skip at least one move in a given week. The state you logged is the state most of them logged."
- "The pattern you're noticing this week is the same pattern most people on this archetype track through weeks two and three."
- "Cold outreach silence is the most common pattern at this point in the plan. People on this archetype tend to break through in week four when the third or fourth contact lands."

If there is genuinely no dominant pattern (e.g., the user had a strong week on track with nothing notable), name that honestly in the pattern field and offer a forward-looking action that builds on the momentum. Do not invent friction where there isn't any.

NO-CHECKIN EDGE CASE — strict field disambiguation required

If the user did not check in any day this week (every day shows state="no_checkin"), the four fields MUST stay distinct. Do not duplicate the same sentence across fields. Specifically:

- week_summary: numeric/factual only. State the counts: "0 of 7 days checked in. 0 plan updates logged. Currently day N of 30." Use the current_day from the input to anchor where they are in the plan. No commentary.

- dominant_pattern: name the behaviour, not the count. Acceptable shapes: "You did not check in any day this week.", "You went silent for the full week — no check-ins, no logged updates.", "Your last check-in was [date if known from input]." Use the user's current_day position to add specificity if useful, but do not repeat the numeric facts that already live in week_summary.

- reframe: normalise the silence without judgement and without reassurance. Slightly uncomfortable, useful. Examples of the right shape: "Silence usually means something else won the week. Naming what won makes the next move easier." or "A blank week is a data point. The plan adapts as soon as you give it one signal."

- next_week_action: one small re-entry move, NOT a 30-day reset, NOT a guilt trip. Specific examples: "Log a single check-in with one sentence about your current priority — that's all this week needs." or "Pick one task from your plan today and do the smallest possible version of it. Send what you've got, not what's perfect."

EXAMPLE OUTPUT (for shape, not content)

{
  "week_summary": "You completed 3 of 7 planned tasks. You checked in 4 of 7 days. Two tasks were moved forward; one was missed.",
  "dominant_pattern": "You logged \\"doesn't feel ready yet\\" or a close variant on three of the five moves you didn't complete.",
  "reframe": "Ready is the friction. The move happens before you feel ready, not after. The version you'd send when you feel ready is the same version you can send today.",
  "next_week_action": "This week, the next time you defer a Direct move, spend 90 seconds writing the lowest-quality version of the message you could possibly send. Then send that one. Don't edit it.",
  "cohort_pulse": "Most people on this archetype log \\"not ready yet\\" at least once a week through the first half of the plan. The pattern usually breaks when the lowest-quality version goes out and gets a reply anyway."
}`;

function formatUserPrompt(input: FrictionReviewInput): string {
  const lines: string[] = [];
  lines.push(`User context:`);
  lines.push(`- Archetype: ${input.archetype}`);
  lines.push(`- Current day in plan: ${input.current_day} of ${input.plan_length}`);
  lines.push(
    `- Active strands: ${input.active_strands.length > 0 ? input.active_strands.join(", ") : "(none yet)"}`,
  );
  if (input.replan_summary) {
    lines.push(`- A replan fired this week: ${input.replan_summary}`);
  }
  lines.push("");
  lines.push(`Last 7 days of check-in data (oldest first):`);
  if (input.days.length === 0) {
    lines.push(`  (no check-in data available for the last 7 days)`);
  } else {
    for (const day of input.days) {
      lines.push(`- ${day.date}: state=${day.state}`);
      if (day.narrative) {
        lines.push(`    Narrative: ${day.narrative}`);
      }
      if (day.plan_updates.length > 0) {
        lines.push(`    Plan updates (${day.plan_updates.length}):`);
        for (const u of day.plan_updates) {
          const noteFragment = u.notes ? ` — "${u.notes}"` : "";
          lines.push(
            `      • ${u.task_id} → ${u.new_status}${noteFragment}`,
          );
        }
      } else {
        lines.push(`    (no plan updates this day)`);
      }
    }
  }
  lines.push("");
  lines.push(
    `Produce the Weekly Friction Review for this user. Hold the voice contract strictly. Use the user's own logged words wherever possible.`,
  );
  return lines.join("\n");
}
