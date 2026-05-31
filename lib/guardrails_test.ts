// lib/guardrails_test.ts
//
// WP6 unit tests + acceptance check. Run with:
//   deno test --allow-none lib/guardrails_test.ts
//
// Covers each individual check and the two orchestrators, then runs a small
// labelled corpus to assert the WP6 acceptance criterion: bad outputs are
// caught, and the false-positive rate on legitimate Solo-style outputs is
// under 5%.

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.220.0/assert/mod.ts";

import {
  checkBannedPhrases,
  checkDraftLength,
  checkExclamation,
  checkNotYConstruction,
  checkPricingSanity,
  checkRequiredReportFields,
  runDraftGuardrails,
  runReportGuardrails,
  scoreCorpus,
  stripEmDashes,
  type GuardrailOptions,
} from "./guardrails.ts";

// -----------------------------------------------------------------------------
// Em dashes
// -----------------------------------------------------------------------------

Deno.test("stripEmDashes replaces em and en dashes with a comma", () => {
  const { text, count } = stripEmDashes("Your edge — the EMEA angle — is real.");
  assertEquals(count, 2);
  assertEquals(text, "Your edge, the EMEA angle, is real.");
});

Deno.test("stripEmDashes is a no-op when no dashes present", () => {
  const { text, count } = stripEmDashes("A clean sentence, with a comma.");
  assertEquals(count, 0);
  assertEquals(text, "A clean sentence, with a comma.");
});

// -----------------------------------------------------------------------------
// Banned phrases
// -----------------------------------------------------------------------------

Deno.test("strict banned phrases are caught as strict flags", () => {
  const v = checkBannedPhrases("I hope this message finds you well and wanted to reach out.");
  assert(v.length >= 1);
  assert(v.every((x) => x.check === "banned_phrase"));
  assert(v.some((x) => x.match === "hope this message finds you well" && x.strict));
});

Deno.test("contextual words are review-only by default (not strict)", () => {
  const v = checkBannedPhrases("This is a unique opportunity to leverage your network.");
  // 'unique' and 'leverage' should be flagged but as non-strict.
  assert(v.length >= 1);
  assert(v.every((x) => x.strict === false));
});

Deno.test("contextual_as_strict escalates contextual words", () => {
  const v = checkBannedPhrases("Leverage your synergies.", { contextual_as_strict: true });
  assert(v.some((x) => x.match === "leverage" && x.strict === true));
});

Deno.test("single-word banned matches respect word boundaries", () => {
  // 'grind' should not match inside 'grinding' is acceptable either way, but
  // 'scale' is intentionally NOT in the list to avoid 'type scale' false hits.
  const v = checkBannedPhrases("We use a consistent type scale across the report.");
  assertEquals(v.length, 0);
});

// -----------------------------------------------------------------------------
// "X is not Y, it is Z" construction
// -----------------------------------------------------------------------------

Deno.test("not-Y construction is detected", () => {
  const v = checkNotYConstruction("Your narrowness is not a limitation, it is a signal.");
  assertEquals(v.length, 1);
  assertEquals(v[0].check, "not_y_construction");
});

Deno.test("plain negation does not trip the not-Y check", () => {
  const v = checkNotYConstruction("VAT registration is not required below the threshold.");
  assertEquals(v.length, 0);
});

// -----------------------------------------------------------------------------
// Exclamation
// -----------------------------------------------------------------------------

Deno.test("exclamation marks are flagged", () => {
  assertEquals(checkExclamation("Great news!").length, 1);
  assertEquals(checkExclamation("No marks here.").length, 0);
});

// -----------------------------------------------------------------------------
// Draft length
// -----------------------------------------------------------------------------

Deno.test("draft over 250 words blocks", () => {
  const long = Array.from({ length: 260 }, (_, i) => `word${i}`).join(" ");
  const v = checkDraftLength(long);
  assertExists(v);
  assertEquals(v?.severity, "block");
});

Deno.test("draft under 250 words passes", () => {
  assertEquals(checkDraftLength("A short, sendable note."), null);
});

Deno.test("draft length limit is configurable", () => {
  const text = Array.from({ length: 60 }, (_, i) => `w${i}`).join(" ");
  assertExists(checkDraftLength(text, { max_draft_words: 50 }));
  assertEquals(checkDraftLength(text, { max_draft_words: 100 }), null);
});

// -----------------------------------------------------------------------------
// Required fields
// -----------------------------------------------------------------------------

function fullReport(): Record<string, unknown> {
  return {
    core_report: {
      hook_insight: { headline: "A sharp headline", paragraph: "A specific paragraph." },
      options: Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1,
        business_model_id: `BM_${i}`,
        model_name: `Model ${i}`,
        pricing: { range_low_gbp: 500, range_high_gbp: 2000 },
      })),
      recommendation: { recommended_rank: 1 },
      ai_impact: { summary: "AI impact text." },
    },
  };
}

Deno.test("a complete report passes required-field checks", () => {
  assertEquals(checkRequiredReportFields(fullReport()).length, 0);
});

Deno.test("missing hook_insight blocks", () => {
  const r = fullReport();
  (r.core_report as Record<string, unknown>).hook_insight = "";
  const v = checkRequiredReportFields(r);
  assert(v.some((x) => x.field === "hook_insight" && x.severity === "block"));
});

Deno.test("too few options blocks", () => {
  const r = fullReport();
  (r.core_report as Record<string, unknown>).options = [{ rank: 1 }];
  const v = checkRequiredReportFields(r);
  assert(v.some((x) => x.field === "options"));
});

Deno.test("first_move only checked when activation_plan present", () => {
  const r = fullReport();
  // No activation_plan → first_move not required.
  assert(!checkRequiredReportFields(r).some((x) => x.field === "first_move"));
  // With an empty activation_plan.first_move → required.
  r.activation_plan = { first_move: null };
  assert(checkRequiredReportFields(r).some((x) => x.field === "first_move"));
});

// -----------------------------------------------------------------------------
// Pricing sanity
// -----------------------------------------------------------------------------

Deno.test("pricing within KB range passes; out of range blocks", () => {
  const ranges = { BM_0: { min_gbp: 100, max_gbp: 5000 } };
  const ok = fullReport();
  assertEquals(checkPricingSanity(ok, { pricing_ranges: ranges }).length, 0);

  const bad = fullReport();
  (bad.core_report as Record<string, unknown>).options = [
    { rank: 1, business_model_id: "BM_0", pricing: { range_low_gbp: 10, range_high_gbp: 99999 } },
  ];
  const v = checkPricingSanity(bad, { pricing_ranges: ranges });
  assert(v.length >= 1 && v.every((x) => x.severity === "block"));
});

Deno.test("pricing sanity is a no-op without ranges", () => {
  assertEquals(checkPricingSanity(fullReport()).length, 0);
});

// -----------------------------------------------------------------------------
// Draft orchestrator
// -----------------------------------------------------------------------------

Deno.test("runDraftGuardrails sanitises em dashes and flags banned phrases", () => {
  const res = runDraftGuardrails("I wanted to reach out — hope this message finds you well.");
  assert(res.sanitised_text && !res.sanitised_text.includes("—"));
  assert(res.violations.some((v) => v.check === "em_dash"));
  assert(res.violations.some((v) => v.check === "banned_phrase" && v.strict));
  // Banned phrases are flags, not blocks → draft still "passes" (no regenerate).
  assertEquals(res.regenerate, false);
});

Deno.test("runDraftGuardrails blocks an over-length draft", () => {
  const long = Array.from({ length: 300 }, (_, i) => `w${i}`).join(" ");
  const res = runDraftGuardrails(long);
  assertEquals(res.passed, false);
  assertEquals(res.regenerate, true);
});

// -----------------------------------------------------------------------------
// Report orchestrator
// -----------------------------------------------------------------------------

Deno.test("runReportGuardrails passes a clean full report", () => {
  const res = runReportGuardrails(fullReport());
  assertEquals(res.regenerate, false);
  assertEquals(res.passed, true);
});

Deno.test("runReportGuardrails blocks a report missing the recommendation", () => {
  const r = fullReport();
  delete (r.core_report as Record<string, unknown>).recommendation;
  const res = runReportGuardrails(r);
  assertEquals(res.passed, false);
});

// -----------------------------------------------------------------------------
// Acceptance: catch rate + false-positive rate on a labelled corpus
// -----------------------------------------------------------------------------

Deno.test("WP6 acceptance: bad outputs caught, FP < 5% on legitimate", () => {
  const opts: GuardrailOptions = {};

  // Legitimate Solo-style reports (should NOT be strict-flagged).
  const legit = (extraHook: string): { report: Record<string, unknown>; legitimate: boolean } => {
    const r = fullReport();
    (r.core_report as Record<string, unknown>).hook_insight = {
      headline: "Your audit experience reads as risk fluency",
      paragraph: extraHook,
    };
    return { report: r, legitimate: true };
  };

  const legitimateItems = [
    legit("Your three closed-deal references in EMEA SaaS are the credibility most buyers ask for first."),
    legit("The narrowness reads as a signal to procurement, not as a limitation on scope."),
    legit("First income is most realistic through a named former colleague at a mid-market firm."),
    legit("Pricing at the day-rate end matches what fractional CFOs in your sector quote."),
    legit("Your record of cutting close time by nine days is the proof point to lead with."),
    legit("A focused profile on two platforms will generate more inbound than a broad one."),
    legit("The first client is the hardest part; the warm intro shortens that materially."),
    legit("Independent advisory work in compliance is where your regulatory depth pays off."),
    legit("Most of your network sits in-house, so a referral ask beats a cold approach."),
    legit("The realistic path is part-time alongside your current role for the first quarter."),
    legit("Your sector knowledge in pensions is rare enough to charge a premium day rate."),
    legit("Buyers in this space value a track record over a polished pitch."),
  ];

  // Bad outputs (should be caught).
  const badItems: Array<{ report: Record<string, unknown>; legitimate: boolean }> = [
    // strict banned phrase in hook
    (() => {
      const r = fullReport();
      (r.core_report as Record<string, unknown>).hook_insight = {
        headline: "Unlock your potential",
        paragraph: "In today's fast-paced world, supercharge your journey and crush it.",
      };
      return { report: r, legitimate: false };
    })(),
    // missing required field
    (() => {
      const r = fullReport();
      delete (r.core_report as Record<string, unknown>).recommendation;
      return { report: r, legitimate: false };
    })(),
    // not-Y construction + exclamation
    (() => {
      const r = fullReport();
      (r.core_report as Record<string, unknown>).hook_insight = {
        headline: "This is not a feature, it is a foundation!",
        paragraph: "A revolutionary, game-changing approach.",
      };
      return { report: r, legitimate: false };
    })(),
    // too few options
    (() => {
      const r = fullReport();
      (r.core_report as Record<string, unknown>).options = [{ rank: 1, business_model_id: "BM_0" }];
      return { report: r, legitimate: false };
    })(),
  ];

  const metrics = scoreCorpus([...legitimateItems, ...badItems], opts);

  // Every bad item should be caught.
  assertEquals(metrics.catch_rate, 1, `expected catch_rate 1, got ${metrics.catch_rate}`);
  // False positives on legitimate items must stay under 5%.
  assert(
    metrics.false_positive_rate < 0.05,
    `false_positive_rate ${metrics.false_positive_rate} exceeds 0.05`,
  );
});
