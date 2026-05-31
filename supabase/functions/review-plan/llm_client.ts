// lib/llm_client.ts
//
// WP5 + WP10 keystone — the single chokepoint for every LLM call.
//
// No edge function should call OpenAI directly once this is wired. The client
// centralises: model routing by prompt_id (WP5), strict structured-output
// enforcement (WP3), retry on 429/5xx, cost computation, and per-call logging
// into public.prompt_runs (WP10). An optional guardrails hook (WP6) can run on
// the output. Design: admin/wp5-llm-client-keystone-design-2026-05-31.md.
//
// Deno-compatible. The only I/O is the OpenAI fetch and an optional Supabase
// insert into prompt_runs; the routing + cost maths are pure and unit-tested.
//
// INCREMENT 1 (this file): standalone module + tests. Wiring functions to it
// is done incrementally + eval-protected in later increments.

// -----------------------------------------------------------------------------
// Model tier map (WP5). Selection is by prompt_id — never hard-coded in a fn.
// -----------------------------------------------------------------------------

export type Tier = 1 | 2 | 3;

// Model lineup confirmed 2026-05-31 ("modernise everything"): Tier-1 generation
// AND judges → GPT-5.4; Tier-2 → gpt-5.4-mini. `gpt-5.4-mini` is confirmed in
// production (parse-cv v29). `gpt-5.4` is the frontier string — CONFIRM the exact
// API id against platform.openai.com (could be e.g. "gpt-5.4" or a dated variant).
export const FRONTIER_MODEL = "gpt-5.4";
export const MINI_MODEL = "gpt-5.4-mini";

/** prompt_id -> tier. Tier 3 = no LLM (handled by callers; never reaches here). */
export const TIER_MAP: Record<string, Tier> = {
  // Tier 1 — creative-generative, worth frontier:
  "P1-core-report": 1,
  "P2-hook": 1,
  "P3-activation-plan": 1,
  "P9-ask-solo": 1,
  "hook-regenerator": 1,
  "first-move-regenerator": 1,
  "P3b-plan-consistency-reviewer": 1,
  // Judges keep frontier for calibration stability:
  "judge-1-specificity": 1,
  "judge-2-realism": 1,
  "judge-3-seniority-calibration": 1,
  "judge-4-hook-insight-quality": 1,
  "judge-5-first-move-quality": 1,
  // Tier 2 — extraction / retrieval / structured, gpt-5.4-mini:
  "P0-cv-parser": 2,
  "P0b-domain-classifier": 2,
  "P0b-cv-confidence-scorer": 2,
  "P4-market-snapshot": 2,
  "P5-checkin-processor": 2,
  "P7-ai-impact": 2,
  "P8-guidance-module": 2,
};

export function modelForPrompt(prompt_id: string): string {
  const tier = TIER_MAP[prompt_id];
  // Default to frontier for unknown prompts — safe (no silent quality drop).
  // Flip a prompt to Tier 2 only after an eval shows scores hold (WP5 rule).
  return tier === 2 ? MINI_MODEL : FRONTIER_MODEL;
}

// -----------------------------------------------------------------------------
// Cost (pure, unit-tested)
// -----------------------------------------------------------------------------

const USD_TO_GBP = 0.79;

// USD per 1M tokens. PLACEHOLDER values carried over from gpt-4o — CONFIRM the
// real gpt-5.4 / gpt-5.4-mini prices from platform.openai.com/pricing and replace.
// The cost log is for observability, not billing, so approximate is tolerable
// until confirmed (it will under/over-state cost proportionally, not break).
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-5.4": { input: 2.5, output: 10.0 },        // TODO: confirm real price
  "gpt-5.4-mini": { input: 0.15, output: 0.6 },   // TODO: confirm real price
};

export function computeCostGbp(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? PRICING[FRONTIER_MODEL];
  const usd = (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
  return Math.round(usd * USD_TO_GBP * 100000) / 100000;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CompleteArgs {
  prompt_id: string;
  system_prompt: string;
  user_payload: unknown;
  api_key: string;
  /** Strict json_schema (WP3). Omit for json_object fallback. */
  response_schema?: { name: string; strict?: boolean; schema: unknown };
  /** From the prompt file header (WP1 sub-PR D) — logged to prompt_runs. */
  prompt_version_hash?: string;
  temperature?: number;
  max_tokens?: number;
  /** Context for prompt_runs logging. */
  report_id?: string;
  user_id?: string;
  function_name?: string;
  /** Optional Supabase client (service-role) for prompt_runs logging. */
  supabase?: { from: (t: string) => { insert: (row: unknown) => Promise<unknown> } };
  /** Optional guardrails hook (WP6) — receives the raw text, returns passed. */
  guardrails?: (text: string) => boolean;
  /** Override model selection (rare; routing is by prompt_id otherwise). */
  model_override?: string;
}

export interface CompleteResult {
  parsed: unknown;
  raw: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_estimate_gbp: number;
  prompt_version_hash: string | null;
  guardrails_passed: boolean | null;
  latency_ms: number;
  duration_retries: number;
}

// -----------------------------------------------------------------------------
// The call (with retry) + logging
// -----------------------------------------------------------------------------

const MAX_RETRIES = 3;

export async function complete(args: CompleteArgs): Promise<CompleteResult> {
  const model = args.model_override ?? modelForPrompt(args.prompt_id);
  const response_format = args.response_schema
    ? { type: "json_schema" as const, json_schema: { name: args.response_schema.name, strict: args.response_schema.strict ?? true, schema: args.response_schema.schema } }
    : { type: "json_object" as const };

  const body = {
    model,
    messages: [
      { role: "system", content: args.system_prompt },
      // Accept a pre-built string user message (e.g. parse-cv's buildP0UserMessage)
      // OR a structured object (stringified). Lets the client wrap both styles.
      { role: "user", content: typeof args.user_payload === "string" ? args.user_payload : JSON.stringify(args.user_payload) },
    ],
    response_format,
    temperature: args.temperature ?? (TIER_MAP[args.prompt_id] === 1 ? 0.7 : 0),
    // gpt-5.x uses max_completion_tokens (not the older max_tokens).
    max_completion_tokens: args.max_tokens ?? 2048,
  };

  const t0 = Date.now();
  let attempt = 0;
  let raw = "";
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${args.api_key}` },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      const json = await resp.json();
      raw = json?.choices?.[0]?.message?.content ?? "";
      inputTokens = json?.usage?.prompt_tokens ?? 0;
      outputTokens = json?.usage?.completion_tokens ?? 0;
      break;
    }
    const errText = await resp.text();
    const retryable = resp.status === 429 || (resp.status >= 500 && resp.status < 600);
    if (!retryable || attempt >= MAX_RETRIES) {
      throw new Error(`llm_client[${args.prompt_id}] OpenAI ${resp.status}: ${errText.slice(0, 400)}`);
    }
    const m = errText.match(/try again in ([\d.]+)s/i);
    const sleepMs = resp.status === 429 ? Math.ceil((m && m[1] ? parseFloat(m[1]) : 30) * 1000) + 500 : 2000 * (attempt + 1);
    await new Promise((r) => setTimeout(r, sleepMs));
    attempt++;
  }

  const latency_ms = Date.now() - t0;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // strict json_schema guarantees valid JSON; json_object can still 1-in-N
    // return a refusal. Surface raw; caller decides.
    parsed = null;
  }

  const cost_estimate_gbp = computeCostGbp(model, inputTokens, outputTokens);
  const guardrails_passed = args.guardrails ? args.guardrails(raw) : null;
  const prompt_version_hash = args.prompt_version_hash ?? null;

  // WP10: log the call to prompt_runs (best-effort; never throws the request).
  if (args.supabase) {
    try {
      await args.supabase.from("prompt_runs").insert({
        prompt_id: args.prompt_id,
        prompt_version_hash,
        function_name: args.function_name ?? null,
        user_id: args.user_id ?? null,
        report_id: args.report_id ?? null,
        model,
        input_token_count: inputTokens,
        output_token_count: outputTokens,
        cost_estimate_gbp,
        latency_ms,
        guardrails_passed,
        judge_scores: null,
      });
    } catch (e) {
      console.warn(`llm_client[${args.prompt_id}] prompt_runs log failed:`, (e as Error)?.message ?? e);
    }
  }

  return {
    parsed,
    raw,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_estimate_gbp,
    prompt_version_hash,
    guardrails_passed,
    latency_ms,
    duration_retries: attempt,
  };
}
