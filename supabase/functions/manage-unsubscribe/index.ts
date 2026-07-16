// manage-unsubscribe v1 — 2026-07-01 — ADR-027 / admin/communication-preferences-design.md
// Public (verify_jwt:false), token-authenticated one-click unsubscribe.
//   GET  ?token=...            (email footer click)          -> process + branded HTML confirmation
//   POST ?token=...            (RFC 8058 List-Unsubscribe one-click) -> process + 200 JSON
//   GET  ?token=...&format=json (frontend fetch)              -> process + JSON
// Writes a global marketing suppression (scope 'all') via apply_unsubscribe_token().
// Never blocks transactional or active paid check-in email (see can_send_email()).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const APP_URL = Deno.env.get("APP_BASE_URL") ?? "https://solo-plan.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function page(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} — Solo</title>
<style>
  body{margin:0;background:#FAF9F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1915;}
  .wrap{max-width:520px;margin:0 auto;padding:64px 24px;}
  .brand{color:#15735F;font-weight:800;font-size:22px;letter-spacing:-.01em;margin-bottom:36px;}
  h1{font-size:24px;line-height:1.25;margin:0 0 16px;}
  p{font-size:15px;line-height:1.7;color:#4a4a4a;margin:0 0 16px;}
  .card{background:#fff;border:1px solid #E5E2DC;border-radius:12px;padding:32px;}
  a.btn{display:inline-block;margin-top:8px;background:#2ECDB0;color:#1A1915;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;}
  a.plain{color:#15735F;font-weight:600;text-decoration:none;}
  .muted{font-size:13px;color:#8a857d;margin-top:24px;}
</style></head><body><div class="wrap">
<div class="brand">Solo</div>
<div class="card">${bodyHtml}</div>
<p class="muted">Solo · <a class="plain" href="${APP_URL}">solo-plan.com</a></p>
</div></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const wantsJson = url.searchParams.get("format") === "json";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    if (req.method === "POST" || wantsJson) {
      return new Response(JSON.stringify({ ok: false, error: "config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      page("Something went wrong", "<h1>Something went wrong</h1><p>We couldn't process this right now. Please try again shortly.</p>"),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let ok = false;
  let email: string | null = null;
  if (token) {
    const { data, error } = await supabase.rpc("apply_unsubscribe_token", { p_token: token });
    if (!error && Array.isArray(data) && data.length > 0) {
      ok = data[0].ok === true;
      email = data[0].email ?? null;
    } else if (error) {
      console.error("apply_unsubscribe_token error:", error.message);
    }
  }

  // RFC 8058 one-click POST from mail clients, or explicit JSON fetch
  if (req.method === "POST" || wantsJson) {
    return new Response(JSON.stringify({ ok, email }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Browser GET — branded confirmation page
  if (ok) {
    const who = email ? `<strong>${escapeHtml(email)}</strong>` : "this address";
    const body = `
      <h1>You're unsubscribed.</h1>
      <p>We've stopped all marketing and reminder emails to ${who}. No more nudges, no newsletter, no product updates.</p>
      <p>You'll still get essential account email like sign-in links and payment receipts. If you have an active 30-day plan, its daily check-ins are managed separately in your account.</p>
      <a class="btn" href="${APP_URL}/account">Manage all email preferences &rarr;</a>
      <p class="muted">Changed your mind? You can turn any stream back on from your account at any time.</p>
    `;
    return new Response(page("Unsubscribed", body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const body = `
    <h1>This link is no longer valid.</h1>
    <p>We couldn't match this unsubscribe link. It may have already been used, or the link was incomplete.</p>
    <p>You can manage all of your email preferences from your account.</p>
    <a class="btn" href="${APP_URL}/account">Go to my account &rarr;</a>
  `;
  return new Response(page("Link not valid", body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
