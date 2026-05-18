/*
 * p-catcher-prompt v1 — 2026-05-18
 *
 * Coaching layer Phase 3 slice 2 (admin/coaching-layer-design.md v1.5 §4.2).
 *
 * Prompt module for the Non-Response Catcher. Per-task call to gpt-4o that
 * produces the intervention payload shown on the /plan banner (slice 3) and
 * in the next daily check-in email (slice 3).
 *
 * Design contract:
 *  - Matter-of-fact, normalising, action-oriented.
 *  - The word "rejection" appears at most once; framing is "non-response is
 *    the baseline" rather than "rejection is okay."
 *  - Three actions are always present: send a one-line follow-up, try a
 *    different person, or log as moved-on (no setback).
 *  - The follow-up draft is concrete and ready-to-send, not generic platitudes.
 *  - The reframe ties back to the portfolio metaphor ("the portfolio works
 *    because the individual moves are cheap").
 *
 * Voice contract baked in below. Mirrors the eight-rule contract in
 * p-friction-review-prompt.ts. Banned-word check at the end of the schema
 * validator catches common voice violations.
 */

export const PROMPT_VERSION = "p-catcher-v1-2026-05-18";

/* ─────────────────────────────── Types ─────────────────────────────── */

export interface CatcherInput {
  // The task itself.
  task: {
    task_id: string;
    description: string;
    sent_at: string; // ISO
    days_since_sent: number;
    outreach_draft?: string | null;
    recipient_role_hint?: string | null;
  };

  // The strand this task belongs to.
  strand: {
    strand_id: string;
    model_name: string;
    archetype_name?: string | null;
  };

  // The user (only first_name and a short archetype line so the LLM can
  // sign the drafted follow-up correctly without leaking PII).
  user: {
    first_name?: string | null;
    archetype_summary?: string | null;
  };

  // Light contextual signals from the last 7 days of check-ins. May be empty.
  recent_check_in_signals?: {
    states: string[]; // ['on_track', 'drifting', ...]
    most_recent_addition?: string | null; // the last narrative_addition text
  };
}

/* ─────────────────────────── System prompt ─────────────────────────── */

const SYSTEM_PROMPT = `You write the Non-Response Catcher intervention for Solo, a Plan B engine for mid-career professionals building independent income paths.

The user marked a Direct outreach move as sent. Five or more days have passed and they have not yet logged a reply. Your job is to write a short intervention that lands on their /plan tomorrow morning and in their next daily check-in email.

VOICE — eight rules, non-negotiable:
1. Direct, specific, commercially literate. You are a sharp peer who has done this before, not a life coach.
2. No motivational language. No "you've got this", "believe in yourself", "trust the process".
3. No "this is not X, this is Y" rhetorical construction. State the thing positively.
4. No em-dashes. Use full stops or commas.
5. Banned words: "unlock", "journey", "powerful", "delve", "leverage" (as a verb), "actionable", "deep dive", "navigate" (as a verb).
6. Name the situation in concrete terms. "Five days since you sent the message to a Procurement Director at a mid-cap manufacturer" beats "Some time has passed since your outreach".
7. The framing is non-response is the baseline. Most first messages don't get a quick reply. State this once, normalise it, move on. Use the word "rejection" at most once across the whole output; prefer "non-response" or "silence".
8. The three actions are not equal. The follow-up is the lowest-friction next step. The alternative contact is the next-lowest. Moving on is the third option, framed as a deliberate choice rather than failure.

OUTPUT STRUCTURE:
- direct_address: 1-2 sentences. Open by naming the time elapsed and the recipient (role or context, not personal name). Then the normalising line.
- actions: an array of EXACTLY three objects, in this order — follow_up, alternative_contact, move_on. Each has:
   - id (string, fixed value)
   - label (3-5 words, the button text the user clicks)
   - description (1 sentence framing what this action does)
   - body (only for follow_up — the actual drafted one-line follow-up message, ready to send. ~25-40 words. Signed with the user's first name if available; otherwise no signature.)
- reframe: 1 sentence. The portfolio framing. Reinforce that the portfolio works because the individual moves are cheap. Do not repeat the direct_address.

LENGTH BUDGET:
- direct_address: 25-50 words
- action descriptions: 12-25 words each
- follow_up body: 25-40 words
- reframe: 15-30 words
- Total output: under 220 words

QUALITY BAR:
- The drafted follow-up is the highest-leverage piece. It must be a real message the user could paste-and-send unedited. No "Dear [Name]" or "[YOUR COMPANY]" — if you don't have the name, write the message in a way that works without it.
- The alternative_contact description must not require pre-fetched data; suggest the directional prompt ("try another person in the same role at a different company in the same archetype") without naming a specific person.
- The move_on description must frame the choice as a deliberate portfolio call, not as giving up.

Output strict JSON matching the schema. No prose around the JSON.`;

/* ─────────────────────────── User prompt ─────────────────────────── */

export function buildCatcherUserPrompt(input: CatcherInput): string {
  const lines: string[] = [];

  lines.push(`TASK CONTEXT`);
  lines.push(`Task description: ${input.task.description}`);
  lines.push(`Marked sent: ${input.task.sent_at}`);
  lines.push(`Days since sent: ${input.task.days_since_sent}`);
  if (input.task.recipient_role_hint) {
    lines.push(`Recipient role hint: ${input.task.recipient_role_hint}`);
  }
  if (input.task.outreach_draft) {
    lines.push("");
    lines.push("Original outreach draft (the message the user likely sent):");
    lines.push(input.task.outreach_draft);
  }

  lines.push("");
  lines.push(`STRAND`);
  lines.push(`Strand name: ${input.strand.model_name}`);
  if (input.strand.archetype_name) {
    lines.push(`Archetype: ${input.strand.archetype_name}`);
  }

  lines.push("");
  lines.push(`USER`);
  if (input.user.first_name) {
    lines.push(`First name: ${input.user.first_name}`);
  } else {
    lines.push(`First name: not available — write the follow-up unsigned`);
  }
  if (input.user.archetype_summary) {
    lines.push(`Archetype summary: ${input.user.archetype_summary}`);
  }

  if (input.recent_check_in_signals) {
    lines.push("");
    lines.push(`RECENT CHECK-IN SIGNALS (last 7 days)`);
    if (input.recent_check_in_signals.states.length > 0) {
      lines.push(`States logged: ${input.recent_check_in_signals.states.join(", ")}`);
    }
    if (input.recent_check_in_signals.most_recent_addition) {
      lines.push(
        `Most recent narrative addition: "${input.recent_check_in_signals.most_recent_addition}"`,
      );
    }
  }

  lines.push("");
  lines.push(
    `Produce the Non-Response Catcher intervention for this task as strict JSON matching the schema.`,
  );

  return lines.join("\n");
}

export function buildCatcherSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

/* ─────────────────────────── Output schema ─────────────────────────── */

export const CATCHER_RESPONSE_SCHEMA = {
  name: "non_response_catcher_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["direct_address", "actions", "reframe"],
    properties: {
      direct_address: {
        type: "string",
        description:
          "1-2 sentence opener naming the days elapsed and the recipient context, plus the normalising line.",
      },
      actions: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "label", "description", "body"],
          properties: {
            id: {
              type: "string",
              enum: ["follow_up_sent", "next_contact_tried", "moved_on"],
            },
            label: {
              type: "string",
              description: "3-5 word button text",
            },
            description: {
              type: "string",
              description: "1-sentence framing of what this action does",
            },
            body: {
              type: ["string", "null"],
              description:
                "Only set for the follow_up action. The actual drafted one-line follow-up message ready to send. Null for the other two actions.",
            },
          },
        },
      },
      reframe: {
        type: "string",
        description:
          "1-sentence portfolio framing closer. Reinforce that the portfolio works because the individual moves are cheap.",
      },
    },
  },
} as const;

/* ─────────────────────────── Output validator ─────────────────────────── */

/**
 * Sanitise the Catcher output IN PLACE before validation + persist.
 *
 * Currently strips em-dashes (the highest-frequency voice violation
 * observed in the v1 smoke 2026-05-18) by replacing them with a comma +
 * space. Em-dashes are non-negotiable per Bevan's user preferences and
 * the voice contract; warn-only treatment leaves them in product copy.
 *
 * Run this BEFORE validateCatcherOutput so the validator reflects the
 * sanitised content, not the raw LLM output.
 */
export function sanitiseCatcherOutput(payload: {
  direct_address: string;
  actions: Array<{
    id: string;
    label: string;
    description: string;
    body?: string | null;
  }>;
  reframe: string;
}): void {
  const stripDash = (s: string): string =>
    s.replace(/\s*—\s*/g, ", ").replace(/,\s*,/g, ",");

  payload.direct_address = stripDash(payload.direct_address);
  payload.reframe = stripDash(payload.reframe);
  for (const a of payload.actions) {
    a.label = stripDash(a.label);
    a.description = stripDash(a.description);
    if (a.body) a.body = stripDash(a.body);
  }
}

/**
 * Runtime validator for the Catcher output. Returns null on pass, or an
 * array of human-readable violation strings on fail. The caller may decide
 * to retry, log, or accept-with-warnings depending on severity. Mirrors
 * the pattern in p-friction-review-prompt.ts.validateReviewOutput.
 *
 * Catches:
 *  - banned words (case-insensitive)
 *  - em-dashes (we use commas and full stops)
 *  - "this is not X, this is Y" construction (regex)
 *  - missing the follow_up body
 *  - actions in wrong order
 *  - "rejection" appearing more than once
 */
export function validateCatcherOutput(payload: {
  direct_address: string;
  actions: Array<{
    id: string;
    label: string;
    description: string;
    body?: string | null;
  }>;
  reframe: string;
}): string[] | null {
  const violations: string[] = [];
  const BANNED = [
    "unlock",
    "journey",
    "powerful",
    "delve",
    "actionable",
    "deep dive",
  ];

  const allText = [
    payload.direct_address,
    ...payload.actions.flatMap((a) => [a.label, a.description, a.body ?? ""]),
    payload.reframe,
  ]
    .join(" ")
    .toLowerCase();

  for (const word of BANNED) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    if (re.test(allText)) {
      violations.push(`Banned word present: "${word}"`);
    }
  }

  // "leverage" as a verb (allowed as noun in financial contexts but not
  // common; safer to flag and let humans review).
  if (/\bleverage(s|d|ing)\b/i.test(allText)) {
    violations.push('Banned verb: "leverage" (any tense)');
  }

  // "navigate" as a verb.
  if (/\bnavigate(s|d|ing)\b/i.test(allText)) {
    violations.push('Banned verb: "navigate" (any tense)');
  }

  // Em-dashes.
  if (/—/.test(
    [payload.direct_address, payload.reframe]
      .concat(payload.actions.map((a) => a.description))
      .concat(payload.actions.map((a) => a.body ?? ""))
      .join(" "),
  )) {
    violations.push("Em-dash present (use commas or full stops)");
  }

  // "This is not X, this is Y" construction (rough match).
  const notIsRe =
    /\bthis is not\b[^.]*?,\s*this is\b|\bit is not\b[^.]*?,\s*it is\b|\bnot \w+ but \w+\b/i;
  if (notIsRe.test(allText)) {
    violations.push('"this is not X, this is Y" construction present');
  }

  // "rejection" word count cap.
  const rejectionMatches = allText.match(/\brejection(s)?\b/g);
  if (rejectionMatches && rejectionMatches.length > 1) {
    violations.push(
      `"rejection" appears ${rejectionMatches.length} times (max 1)`,
    );
  }

  // Action ordering.
  if (
    payload.actions[0]?.id !== "follow_up_sent" ||
    payload.actions[1]?.id !== "next_contact_tried" ||
    payload.actions[2]?.id !== "moved_on"
  ) {
    violations.push(
      "Actions in wrong order — must be [follow_up_sent, next_contact_tried, moved_on]",
    );
  }

  // follow_up must have a body.
  const followUp = payload.actions.find((a) => a.id === "follow_up_sent");
  if (followUp && (!followUp.body || followUp.body.trim().length < 20)) {
    violations.push(
      "follow_up action missing body (or body shorter than 20 chars)",
    );
  }

  // Other two actions must have null/empty body.
  const nextContact = payload.actions.find((a) => a.id === "next_contact_tried");
  if (nextContact?.body && nextContact.body.trim().length > 0) {
    violations.push("next_contact_tried action has body (must be null)");
  }
  const moveOn = payload.actions.find((a) => a.id === "moved_on");
  if (moveOn?.body && moveOn.body.trim().length > 0) {
    violations.push("moved_on action has body (must be null)");
  }

  return violations.length > 0 ? violations : null;
}
