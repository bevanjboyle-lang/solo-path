// generate-asked-this-week — ADR-025 Peers layer (2026-06-11)
// FUNCTION_VERSION: asked-this-week-v1.0
//
// Weekly curator for the 'Asked this week' surface. Reads the last 7 days of
// advisory_conversation_summaries (Ask Solo), and IF AND ONLY IF at least 5
// distinct users contributed in the window, distils 2-3 fully anonymised
// question THEMES (never quotes, never specifics that could identify anyone)
// with 2-sentence answer summaries via one gpt-5.4-mini call, and inserts
// them into asked_this_week. Below the 5-user privacy floor it writes
// NOTHING and exits.
//
// verify_jwt: false — cron-callable generator (NOT scheduled yet; schedule
// at launch once Ask Solo volume exists). No user-facing read path here.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const PRIVACY_FLOOR = 5; // distinct users; below this nothing is ever published

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Monday of the current week, UTC, as YYYY-MM-DD. */
function currentWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: rows, error: readErr } = await supabase
      .from("advisory_conversation_summaries")
      .select("user_id, summary, key_topics, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (readErr) throw new Error(`read summaries: ${readErr.message}`);

    const distinctUsers = new Set((rows ?? []).map((r) => r.user_id)).size;
    if (distinctUsers < PRIVACY_FLOOR) {
      console.log(`asked-this-week: ${distinctUsers} distinct users in window (< ${PRIVACY_FLOOR}); not publishing.`);
      return json({
        response_text: "insufficient volume, nothing published",
        distinct_users: distinctUsers,
        privacy_floor: PRIVACY_FLOOR,
        published: 0,
      });
    }

    // Build the anonymised corpus for the model: topics + summaries only,
    // no user ids, no conversation ids.
    const corpus = (rows ?? [])
      .map((r) => {
        const topics = Array.isArray(r.key_topics) ? r.key_topics.join(", ") : "";
        return `- topics: ${topics || "(none)"}\n  summary: ${String(r.summary).slice(0, 600)}`;
      })
      .join("\n");

    const systemPrompt = `You curate "Asked this week" for Solo, a career-independence product. You receive internal summaries of advisory conversations from the past week. Your job is to distil them into 2-3 fully anonymised question THEMES that several people are asking about, each with a 2-sentence answer summary in Solo's voice (UK English, direct, specific, commercially grounded, no hype, no motivational language, no em dashes).

Hard anonymity rules:
- Themes are general patterns (e.g. "How to price a first retainer"), NEVER quotes and NEVER specifics that could identify a person: no names, employers, sectors-plus-locations, unusual role titles, or distinctive personal circumstances.
- If the inputs are too thin or too similar to support a theme without identifying detail, return fewer themes.

Return strict JSON: {"themes":[{"question_theme":"...","answer_summary":"..."}]} with 2-3 entries (or fewer if anonymity demands it). answer_summary must be exactly two sentences.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        response_format: { type: "json_object" },
        max_completion_tokens: 1200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `This week's conversation summaries (${distinctUsers} distinct users):\n\n${corpus}` },
        ],
      }),
    });
    if (!openaiRes.ok) {
      const detail = await openaiRes.text();
      throw new Error(`openai ${openaiRes.status}: ${detail.slice(0, 300)}`);
    }
    const completion = await openaiRes.json();
    const content = completion?.choices?.[0]?.message?.content ?? "{}";

    let parsed: { themes?: { question_theme?: unknown; answer_summary?: unknown }[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("model returned unparseable JSON");
    }
    const themes = (parsed.themes ?? [])
      .filter(
        (t) =>
          typeof t?.question_theme === "string" &&
          (t.question_theme as string).trim().length > 4 &&
          typeof t?.answer_summary === "string" &&
          (t.answer_summary as string).trim().length > 20,
      )
      .slice(0, 3);
    if (themes.length === 0) {
      return json({ response_text: "model produced no publishable themes, nothing published", published: 0 });
    }

    const weekStart = currentWeekStart();
    const inserts = themes.map((t) => ({
      week_start: weekStart,
      question_theme: (t.question_theme as string).trim(),
      answer_summary: (t.answer_summary as string).trim(),
    }));
    const { error: insertErr } = await supabase
      .from("asked_this_week")
      .upsert(inserts, { onConflict: "week_start,question_theme", ignoreDuplicates: true });
    if (insertErr) throw new Error(`insert: ${insertErr.message}`);

    console.log(`asked-this-week: published ${inserts.length} themes for week ${weekStart} (${distinctUsers} distinct users).`);
    return json({
      response_text: `published ${inserts.length} themes for week ${weekStart}`,
      week_start: weekStart,
      distinct_users: distinctUsers,
      published: inserts.length,
    });
  } catch (e) {
    console.error("generate-asked-this-week error:", e);
    return json({ response_text: "asked-this-week generation failed", error: String(e) }, 500);
  }
});
