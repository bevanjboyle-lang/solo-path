// track-event v1 (2026-07-18, Day Zero C1.1 measurement layer)
//
// Public sink for the product's own funnel events (public.events). The table
// has RLS with no anon policies by design; this function is the only write
// path from the client, service-role behind three guards:
//   1. event_type allowlist (diagnostic funnel, design §11)
//   2. payload size cap (2 KB) with email/free-text keys never accepted
//   3. per-IP daily rate limit via consume_rate_limit (C0.10 shim), fail-open
// CORS includes x-client-session-id (Signal go-live lesson). verify_jwt=true
// in config.toml; the anon key satisfies the gateway (parse-cv pattern).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v1-diagnostic-events";

const ALLOWED_EVENT_TYPES = new Set([
  "diagnostic_started",
  "diagnostic_completed",
  "diagnostic_email_captured",
  "diagnostic_read_viewed",
  "diagnostic_to_questionnaire",
  "diagnostic_to_checkout",
]);

// Payload keys we accept; anything else is dropped rather than rejected so
// client evolution never 400s old builds. No emails, no free text.
const ALLOWED_PAYLOAD_KEYS = new Set(["sector", "seniority", "work_type", "variant", "source"]);

const RATE_LIMIT_PER_IP_DAY = Number(Deno.env.get("RATE_LIMIT_TRACK_EVENT_PER_IP_DAY") ?? "300");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// deno-lint-ignore no-explicit-any
async function consumeRateLimit(admin: any, name: string, req: Request, limit: number): Promise<boolean> {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const { data, error } = await admin.rpc("consume_rate_limit", { p_key: `${name}:${ip}`, p_limit: limit });
    if (error) {
      console.error(`rate-limit rpc error (fail-open) [${name}]:`, error.message);
      return true;
    }
    if (data !== true) console.warn(`rate-limit exceeded: ${name} key=${ip}`);
    return data === true;
  } catch (e) {
    console.error(`rate-limit threw (fail-open) [${name}]:`, e);
    return true;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const eventType = typeof body?.event_type === "string" ? body.event_type : "";
    if (!ALLOWED_EVENT_TYPES.has(eventType)) {
      return json({ error: "unknown_event_type" }, 400);
    }

    const clientSessionId =
      typeof body?.client_session_id === "string" && body.client_session_id.length <= 64
        ? body.client_session_id
        : null;

    const rawPayload = body?.payload && typeof body.payload === "object" ? body.payload : {};
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawPayload as Record<string, unknown>)) {
      if (!ALLOWED_PAYLOAD_KEYS.has(k)) continue;
      if (typeof v === "string" && v.length <= 120) payload[k] = v;
      else if (typeof v === "number" || typeof v === "boolean") payload[k] = v;
    }
    if (JSON.stringify(payload).length > 2048) {
      return json({ error: "payload_too_large" }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const allowed = await consumeRateLimit(admin, "track-event", req, RATE_LIMIT_PER_IP_DAY);
    if (!allowed) return json({ error: "rate_limited" }, 429);

    const { error } = await admin.from("events").insert({
      event_type: eventType,
      client_session_id: clientSessionId,
      payload,
    });
    if (error) {
      console.error(`${FUNCTION_VERSION} insert error:`, error.message);
      return json({ error: "insert_failed" }, 500);
    }
    return json({ ok: true });
  } catch (e) {
    console.error(`${FUNCTION_VERSION} error:`, (e as Error)?.message ?? String(e));
    return json({ error: "bad_request" }, 400);
  }
});
