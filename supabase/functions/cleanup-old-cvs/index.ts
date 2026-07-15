// cleanup-old-cvs v1 — 2026-07-15 (Day Zero C0.3)
//
// Replaces the broken pg_cron job 5 SQL (`DELETE FROM storage.objects ...`),
// which has failed nightly since Supabase blocked direct deletes from storage
// tables ("Use the Storage API instead"). This function walks the private
// `cv-uploads` bucket via the Storage API and removes files older than the
// retention window. Privacy-promise item: the product tells users CVs are
// processed and disposed of.
//
// Retention: 90 days (matches the original job 5 SQL). Change RETENTION_DAYS
// deliberately, with Bevan's sign-off, if the policy changes.
//
// Invocation: pg_cron job 5 (02:00 UTC nightly) POSTs {}. Manual invocation
// with {"dry_run": true} reports what would be deleted without deleting.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v1";
const BUCKET = "cv-uploads";
const RETENTION_DAYS = 90;
const MAX_DEPTH = 4;
const LIST_PAGE = 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

function jsonResp(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResp(500, { error: "server_config", response_text: "Missing Supabase env vars." });
  }

  let dryRun = false;
  try {
    const text = await req.text();
    if (text && text.trim().length > 0) dryRun = Boolean(JSON.parse(text)?.dry_run);
  } catch { /* ignore malformed body */ }

  const supabase = createClient(supabaseUrl, serviceKey);
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const stale: string[] = [];
  let scanned = 0;
  const errors: string[] = [];

  async function walk(prefix: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH) return;
    let offset = 0;
    while (true) {
      const { data: entries, error } = await supabase.storage
        .from(BUCKET)
        .list(prefix, { limit: LIST_PAGE, offset, sortBy: { column: "created_at", order: "asc" } });
      if (error) {
        errors.push(`list('${prefix}') failed: ${error.message}`);
        return;
      }
      if (!entries || entries.length === 0) return;
      for (const entry of entries) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        // Folders come back with no id/created_at; recurse into them.
        if (!entry.id) {
          await walk(path, depth + 1);
          continue;
        }
        scanned++;
        const createdAt = entry.created_at ? Date.parse(entry.created_at) : NaN;
        if (!Number.isNaN(createdAt) && createdAt < cutoff) stale.push(path);
      }
      if (entries.length < LIST_PAGE) return;
      offset += LIST_PAGE;
    }
  }

  await walk("", 0);

  let deleted = 0;
  if (!dryRun && stale.length > 0) {
    for (let i = 0; i < stale.length; i += 100) {
      const batch = stale.slice(i, i + 100);
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove(batch);
      if (rmErr) errors.push(`remove batch at ${i} failed: ${rmErr.message}`);
      else deleted += batch.length;
    }
  }

  const summary = {
    bucket: BUCKET,
    retention_days: RETENTION_DAYS,
    scanned,
    stale_found: stale.length,
    deleted,
    dry_run: dryRun,
    errors,
    response_text: dryRun
      ? `Dry run: ${stale.length} file(s) older than ${RETENTION_DAYS} days (of ${scanned} scanned).`
      : `Deleted ${deleted} of ${stale.length} stale file(s) (of ${scanned} scanned).`,
  };
  console.log(`${FUNCTION_VERSION}`, JSON.stringify(summary));
  return jsonResp(errors.length > 0 ? 207 : 200, summary);
});
