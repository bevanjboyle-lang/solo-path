// subscribe-signal v3.1 (2026-07-15, Day Zero C0.7) — capture readers into the
// Signal list AND mirror them to Beehiiv when configured.
// v3.1: publication id now resolves automatically — if BEEHIIV_PUBLICATION_ID
// is not set, the function calls GET /v2/publications once with the API key
// and caches the first publication's id in memory. Only ONE secret needed
// (BEEHIIV_API_KEY).
// v3: best-effort Beehiiv mirror after the signal_subscribers insert (still
// the source of truth, dedupes on lower(email)). Beehiiv errors never block
// the user's response; a missing key is a silent no-op, so this deploys
// safely before the secret exists. Welcome email sent by Beehiiv
// (send_welcome_email: true) once configured there.
// ADR-027 note: broadcast sends run from Beehiiv (its own unsubscribe applies);
// consent-log backfill for signal subscribers remains on the ADR-027 follow-up list.
// v2 (2026-06-01): CORS allow x-client-session-id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v3.1-beehiiv-mirror-autopub";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

let cachedPubId: string | null = null;

async function resolvePublicationId(apiKey: string): Promise<string | null> {
  const fromEnv = Deno.env.get("BEEHIIV_PUBLICATION_ID");
  if (fromEnv) return fromEnv;
  if (cachedPubId) return cachedPubId;
  try {
    const res = await fetch("https://api.beehiiv.com/v2/publications?limit=10", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error(`${FUNCTION_VERSION} publications lookup failed:`, res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    const pubs: Array<{ id?: string; name?: string }> = data?.data ?? [];
    if (pubs.length === 0) {
      console.error(`${FUNCTION_VERSION} no publications on this Beehiiv account`);
      return null;
    }
    const preferred = pubs.find((p) => (p.name ?? "").toLowerCase().includes("signal")) ?? pubs[0];
    cachedPubId = preferred.id ?? null;
    console.log(`${FUNCTION_VERSION} resolved publication:`, preferred.name, cachedPubId);
    return cachedPubId;
  } catch (err) {
    console.error(`${FUNCTION_VERSION} publications lookup threw:`, (err as Error)?.message ?? String(err));
    return null;
  }
}

async function mirrorToBeehiiv(email: string, source: string): Promise<void> {
  const apiKey = Deno.env.get("BEEHIIV_API_KEY");
  if (!apiKey) return; // not configured yet — silent no-op
  const pubId = await resolvePublicationId(apiKey);
  if (!pubId) return;
  try {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
        send_welcome_email: true,
        utm_source: "solo-plan.com",
        utm_medium: source,
      }),
    });
    if (!res.ok) {
      console.error(`${FUNCTION_VERSION} beehiiv mirror failed:`, res.status, (await res.text()).slice(0, 300));
    } else {
      console.log(`${FUNCTION_VERSION} mirrored subscriber to Beehiiv (${source})`);
    }
  } catch (err) {
    console.error(`${FUNCTION_VERSION} beehiiv mirror threw:`, (err as Error)?.message ?? String(err));
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body && body.email ? String(body.email) : "").trim().toLowerCase();
    const source = body && body.source ? String(body.source) : "signal_page";
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "invalid_email", response_text: "Please enter a valid email." }, 400);
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await sb.from("signal_subscribers").insert({ email, source });
    if (error && error.code !== "23505") {
      console.error("subscribe-signal insert error:", error.message);
      return json({ error: "insert_failed", response_text: "Something went wrong. Please try again." }, 500);
    }
    await mirrorToBeehiiv(email, source);
    return json({ ok: true, response_text: "You're on the list for The Signal." });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e), response_text: "Something went wrong." }, 500);
  }
});
