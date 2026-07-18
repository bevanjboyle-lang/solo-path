// subscribe-signal v4 (2026-07-18, Day Zero C1.1) — capture readers into the
// Signal list AND mirror them to Beehiiv when configured.
// v4: diagnostic-sourced capture (free diagnostic, admin/free-diagnostic-design.md):
//   - body.diagnostic {snapshot, sector, seniority, work_type} accepted when
//     source === "diagnostic"
//   - Beehiiv mirror sends custom fields (diagnostic_read / diagnostic_sector /
//     diagnostic_seniority) so the nurture automation's email 1 can merge the
//     read; fields are ensured idempotently once per boot
//   - subscriber is tagged "diagnostic" (automation entry trigger, C1.2)
//   - Beehiiv platform welcome email is suppressed for diagnostic captures;
//     the automation's Day 0 email is their welcome. Signal-page captures keep
//     the existing welcome unchanged.
// v3.1: publication id resolves automatically — if BEEHIIV_PUBLICATION_ID is
// not set, GET /v2/publications once and cache in memory. One secret needed
// (BEEHIIV_API_KEY).
// v3: best-effort Beehiiv mirror after the signal_subscribers insert (still
// the source of truth, dedupes on lower(email)). Beehiiv errors never block
// the user's response; a missing key is a silent no-op.
// ADR-027 note: broadcast sends run from Beehiiv (its own unsubscribe applies);
// consent-log backfill for signal subscribers remains on the ADR-027 follow-up list.
// v2 (2026-06-01): CORS allow x-client-session-id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v4-diagnostic-capture";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

let cachedPubId: string | null = null;
let customFieldsEnsured = false;

interface DiagnosticPayload {
  snapshot: string;
  sector: string;
  seniority: string;
  work_type: string;
}

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

/**
 * Make sure the diagnostic custom fields exist on the publication so the
 * subscription create can populate them. Idempotent; runs once per function
 * boot and only on diagnostic captures. Failures are logged and ignored —
 * the automation's email falls back to the no-merge copy.
 */
async function ensureCustomFields(apiKey: string, pubId: string): Promise<void> {
  if (customFieldsEnsured) return;
  try {
    const wanted = ["diagnostic_read", "diagnostic_sector", "diagnostic_seniority"];
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${pubId}/custom_fields?limit=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error(`${FUNCTION_VERSION} custom_fields list failed:`, res.status, (await res.text()).slice(0, 200));
      return;
    }
    const data = await res.json();
    const existing = new Set(
      ((data?.data ?? []) as Array<{ display?: string }>).map((f) => (f.display ?? "").toLowerCase()),
    );
    for (const name of wanted) {
      if (existing.has(name)) continue;
      const createRes = await fetch(`https://api.beehiiv.com/v2/publications/${pubId}/custom_fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ display: name, kind: "string" }),
      });
      if (!createRes.ok) {
        console.error(
          `${FUNCTION_VERSION} custom_field create failed (${name}):`,
          createRes.status,
          (await createRes.text()).slice(0, 200),
        );
      } else {
        console.log(`${FUNCTION_VERSION} created Beehiiv custom field: ${name}`);
      }
    }
    customFieldsEnsured = true;
  } catch (err) {
    console.error(`${FUNCTION_VERSION} ensureCustomFields threw:`, (err as Error)?.message ?? String(err));
  }
}

async function tagSubscription(apiKey: string, pubId: string, subscriptionId: string, tags: string[]): Promise<void> {
  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions/${subscriptionId}/tags`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ tags }),
      },
    );
    if (!res.ok) {
      console.error(`${FUNCTION_VERSION} tag failed:`, res.status, (await res.text()).slice(0, 300));
    } else {
      console.log(`${FUNCTION_VERSION} tagged subscriber: ${tags.join(", ")}`);
    }
  } catch (err) {
    console.error(`${FUNCTION_VERSION} tag threw:`, (err as Error)?.message ?? String(err));
  }
}

async function mirrorToBeehiiv(email: string, source: string, diagnostic: DiagnosticPayload | null): Promise<void> {
  const apiKey = Deno.env.get("BEEHIIV_API_KEY");
  if (!apiKey) return; // not configured yet — silent no-op
  const pubId = await resolvePublicationId(apiKey);
  if (!pubId) return;
  try {
    const isDiagnostic = source === "diagnostic" && diagnostic !== null;
    if (isDiagnostic) await ensureCustomFields(apiKey, pubId);

    const payload: Record<string, unknown> = {
      email,
      reactivate_existing: true,
      // Diagnostic captures get the automation's Day 0 read-recap as their
      // welcome (C1.2 email 1); everyone else keeps the platform welcome.
      send_welcome_email: !isDiagnostic,
      utm_source: "solo-plan.com",
      utm_medium: source,
    };
    if (isDiagnostic) {
      payload.custom_fields = [
        { name: "diagnostic_read", value: diagnostic.snapshot.slice(0, 1800) },
        { name: "diagnostic_sector", value: diagnostic.sector.slice(0, 120) },
        { name: "diagnostic_seniority", value: diagnostic.seniority.slice(0, 120) },
      ];
    }

    const res = await fetch(`https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`${FUNCTION_VERSION} beehiiv mirror failed:`, res.status, (await res.text()).slice(0, 300));
      return;
    }
    console.log(`${FUNCTION_VERSION} mirrored subscriber to Beehiiv (${source})`);

    if (isDiagnostic) {
      const created = await res.json().catch(() => null);
      const subId = created?.data?.id;
      if (typeof subId === "string" && subId) {
        await tagSubscription(apiKey, pubId, subId, ["diagnostic"]);
      } else {
        console.error(`${FUNCTION_VERSION} no subscription id in create response; tag skipped`);
      }
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

    let diagnostic: DiagnosticPayload | null = null;
    if (source === "diagnostic" && body?.diagnostic && typeof body.diagnostic === "object") {
      const d = body.diagnostic as Record<string, unknown>;
      diagnostic = {
        snapshot: typeof d.snapshot === "string" ? d.snapshot : "",
        sector: typeof d.sector === "string" ? d.sector : "",
        seniority: typeof d.seniority === "string" ? d.seniority : "",
        work_type: typeof d.work_type === "string" ? d.work_type : "",
      };
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await sb.from("signal_subscribers").insert({ email, source });
    if (error && error.code !== "23505") {
      console.error("subscribe-signal insert error:", error.message);
      return json({ error: "insert_failed", response_text: "Something went wrong. Please try again." }, 500);
    }
    await mirrorToBeehiiv(email, source, diagnostic);
    return json({ ok: true, response_text: "You're on the list for The Signal." });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e), response_text: "Something went wrong." }, 500);
  }
});
