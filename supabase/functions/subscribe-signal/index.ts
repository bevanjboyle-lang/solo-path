// subscribe-signal v1 (2026-06-01) — capture readers into the Signal list.
// Public (verify_jwt:false). Service-role write into signal_subscribers; dedupes
// on lower(email). Returns ok for both new and existing emails (no enumeration).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
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
    if (error && error.code !== "23505") { // 23505 = already subscribed; treat as success
      console.error("subscribe-signal insert error:", error.message);
      return json({ error: "insert_failed", response_text: "Something went wrong. Please try again." }, 500);
    }
    return json({ ok: true, response_text: "You're on the list for The Signal." });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e), response_text: "Something went wrong." }, 500);
  }
});
