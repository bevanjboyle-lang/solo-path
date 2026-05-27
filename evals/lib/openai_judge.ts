// evals/lib/openai_judge.ts
//
// Thin OpenAI client wrapper for judges. Uses gpt-4o per WP1 design v1.1
// decision 6, with response_format = json_object so we get parseable output.
//
// Cost estimate: gpt-4o-2024-08-06 priced at $2.50 / 1M input tokens,
// $10.00 / 1M output tokens (as of 2026-05; revisit if pricing changes).

const OPENAI_GPT4O_INPUT_USD_PER_M = 2.5;
const OPENAI_GPT4O_OUTPUT_USD_PER_M = 10.0;
const USD_TO_GBP = 0.79;

export interface OpenAICompletion {
  parsed: unknown;
  raw_response: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_estimate_gbp: number;
  duration_ms: number;
}

export interface CallOpenAIArgs {
  api_key: string;
  model: string;
  system_prompt: string;
  user_payload_json: unknown;
  /** Optional max_tokens cap; defaults to 1024 (judges return tiny JSON objects). */
  max_tokens?: number;
}

/**
 * Parse the "Please try again in 31.096s" hint from an OpenAI 429 response body.
 * Returns the suggested sleep in ms, or a fallback of 30s if not parseable.
 */
function parseRetryAfterSeconds(errBody: string): number {
  const m = errBody.match(/try again in ([\d.]+)s/i);
  if (m && m[1]) {
    const secs = parseFloat(m[1]);
    if (!isNaN(secs) && secs > 0) return Math.ceil(secs * 1000) + 500; // +500ms padding
  }
  return 30_000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callOpenAIJudge(args: CallOpenAIArgs): Promise<OpenAICompletion> {
  const t0 = performance.now();

  const body = {
    model: args.model,
    messages: [
      { role: "system", content: args.system_prompt },
      { role: "user", content: JSON.stringify(args.user_payload_json) },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: args.max_tokens ?? 1024,
  };

  const MAX_RETRIES = 3;
  let attempt = 0;
  let resp: Response;
  // Retry loop for 429 rate-limit and transient 5xx.
  while (true) {
    resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.api_key}`,
      },
      body: JSON.stringify(body),
    });

    if (resp.ok) break;

    const errText = await resp.text();

    // Retry on 429 (rate limit) or transient 5xx; bail on everything else.
    const isRetryable = resp.status === 429 || (resp.status >= 500 && resp.status < 600);
    if (!isRetryable || attempt >= MAX_RETRIES) {
      throw new Error(`OpenAI judge call failed: ${resp.status} ${errText.slice(0, 500)}`);
    }

    // Sleep for the duration OpenAI suggests (or 30s fallback), then retry.
    const sleepMs = resp.status === 429 ? parseRetryAfterSeconds(errText) : 2_000 * (attempt + 1);
    console.warn(
      `[openai_judge] ${resp.status} on attempt ${attempt + 1}/${MAX_RETRIES + 1}; sleeping ${(sleepMs / 1000).toFixed(1)}s then retrying.`,
    );
    await sleep(sleepMs);
    attempt++;
  }

  const duration_ms = Math.round(performance.now() - t0);

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI judge call failed: ${resp.status} ${errText.slice(0, 500)}`);
  }

  const json = await resp.json();
  const raw_response = json?.choices?.[0]?.message?.content ?? "";
  const prompt_tokens = json?.usage?.prompt_tokens ?? 0;
  const completion_tokens = json?.usage?.completion_tokens ?? 0;
  const cost_usd =
    (prompt_tokens / 1_000_000) * OPENAI_GPT4O_INPUT_USD_PER_M +
    (completion_tokens / 1_000_000) * OPENAI_GPT4O_OUTPUT_USD_PER_M;
  const cost_estimate_gbp = cost_usd * USD_TO_GBP;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw_response);
  } catch (e) {
    throw new Error(
      `OpenAI judge returned non-JSON response despite response_format=json_object. Raw: ${raw_response.slice(0, 400)}`,
    );
  }

  return {
    parsed,
    raw_response,
    prompt_tokens,
    completion_tokens,
    cost_estimate_gbp,
    duration_ms,
  };
}
