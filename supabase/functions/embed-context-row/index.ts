// embed-context-row v1 — WP4 (2026-06-01)
//
// Embedding-on-write target. Fired by DB triggers on checkin_history and
// advisory_conversation_summaries (via pg_net), and reused by the one-off
// backfill. Looks up the source row's text, embeds it (text-embedding-3-small
// via lib/llm_client), and upserts into public.context_embeddings keyed by
// (source_table, source_id). Idempotent — re-firing overwrites.
//
// verify_jwt:false: invoked by Postgres triggers / cron, not end users. Reads +
// writes with the service role. Best-effort by design: failures are logged and
// returned as 200 so a transient embed error never blocks the trigger's txn path.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { embed, toPgVector } from "../lib/llm_client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED = new Set(["checkin_history", "advisory_conversation_summaries"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );
  const apiKey = Deno.env.get("OPENAI_API_KEY") || "";

  try {
    const body = await req.json().catch(() => ({}));
    const sourceTable: string = body.source_table || "";
    const sourceId: string = String(body.source_id || "");

    if (!ALLOWED.has(sourceTable) || !sourceId) {
      return new Response(JSON.stringify({ ok: false, error: "bad source_table/source_id" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Resolve the row's embeddable text + user_id ----
    let text = "";
    let rowUserId: string | null = null;

    if (sourceTable === "checkin_history") {
      const { data } = await supabase.from("checkin_history")
        .select("user_id, day_number, state, narrative_addition, exchanges").eq("id", sourceId).limit(1);
      const row = data?.[0];
      if (row) {
        rowUserId = row.user_id;
        const note = row.narrative_addition || "";
        const exchanges = Array.isArray(row.exchanges)
          ? row.exchanges.map((e: any) => (typeof e === "string" ? e : (e?.user ?? e?.text ?? JSON.stringify(e)))).join(" ")
          : "";
        text = `Day ${row.day_number ?? "?"} (${row.state ?? "?"}): ${note || exchanges}`.trim();
      }
    } else {
      const { data } = await supabase.from("advisory_conversation_summaries")
        .select("user_id, summary, significant_decisions").eq("id", sourceId).limit(1);
      const row = data?.[0];
      if (row) {
        rowUserId = row.user_id;
        text = `${row.summary || ""}${row.significant_decisions ? ` Decisions: ${row.significant_decisions}` : ""}`.trim();
      }
    }

    if (!rowUserId || !text) {
      return new Response(JSON.stringify({ ok: false, error: "row not found or empty text" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Embed + upsert ----
    const vec = await embed({ api_key: apiKey, text });
    const { error } = await supabase.from("context_embeddings").upsert({
      source_table: sourceTable,
      source_id: sourceId,
      user_id: rowUserId,
      embedding: toPgVector(vec),
    }, { onConflict: "source_table,source_id" });

    if (error) {
      console.error("embed-context-row upsert error:", error.message);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, source_table: sourceTable, source_id: sourceId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embed-context-row error:", (e as Error)?.message ?? e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
