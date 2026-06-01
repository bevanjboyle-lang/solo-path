// summarise-old-checkins v1 — WP4 §4.3 (2026-06-01)
//
// Nightly rolling summarisation. For users past Day 14, check-ins older than 7
// days (day_number <= current_day - 7) that haven't yet been folded are
// summarised into tracker_sessions.running_narrative, and the watermark
// narrative_summarised_through_day is advanced. Raw checkin_history rows are
// NEVER modified or deleted (immutable audit + future fine-tuning gold). This is
// what keeps the assembler's recent_checkins block bounded and the 8k context
// invariant holding at Day 365: the assembler reads only check-ins with
// day_number > narrative_summarised_through_day; everything older lives in the
// (compressible) running_narrative.
//
// Off the user critical path (cron-fired, verify_jwt:false). Same pattern as the
// Signal / friction-review nightly jobs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gpt-5.4-mini";
const DAY_THRESHOLD = 14; // only users past Day 14
const FOLD_LAG_DAYS = 7;  // fold check-ins older than 7 days

const SUMMARISER_SYSTEM = `You maintain a rolling narrative of a Solo user's Plan B execution. You are given the existing running narrative plus a batch of older daily check-ins that are about to fall out of the recent window. Fold the check-ins into the narrative: preserve concrete events, decisions, what was tried, what worked, and what stalled — by strand where relevant. Keep it tight and factual, third person, no motivational language, no preamble. Return ONLY the updated narrative text (no JSON, no headers).`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );
  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") || "" });

  const result = { scanned: 0, summarised: 0, skipped: 0, errors: 0 as number, details: [] as unknown[] };

  try {
    const { data: sessions, error } = await supabase
      .from("tracker_sessions")
      .select("id, user_id, current_day, running_narrative, narrative_summarised_through_day")
      .gt("current_day", DAY_THRESHOLD);

    if (error) throw error;

    for (const s of (sessions ?? []) as any[]) {
      result.scanned++;
      const currentDay = Number(s.current_day ?? 0);
      const cutoff = currentDay - FOLD_LAG_DAYS; // fold check-ins with day_number <= cutoff
      const through = Number(s.narrative_summarised_through_day ?? 0) || 0;
      if (cutoff <= through) { result.skipped++; continue; }

      const { data: olds } = await supabase
        .from("checkin_history")
        .select("day_number, state, narrative_addition, exchanges")
        .eq("user_id", s.user_id)
        .gt("day_number", through)
        .lte("day_number", cutoff)
        .order("day_number", { ascending: true });

      const batch = (olds ?? []) as any[];
      if (!batch.length) {
        // No new check-ins to fold; still advance the watermark so we don't rescan.
        await supabase.from("tracker_sessions").update({ narrative_summarised_through_day: cutoff }).eq("id", s.id);
        result.skipped++;
        continue;
      }

      const batchText = batch.map((c) => {
        const note = c.narrative_addition || "";
        const ex = Array.isArray(c.exchanges)
          ? c.exchanges.map((e: any) => (typeof e === "string" ? e : (e?.user ?? e?.text ?? ""))).join(" ")
          : "";
        return `Day ${c.day_number} (${c.state ?? "?"}): ${(note || ex).slice(0, 800)}`;
      }).join("\n");

      const userMsg = `Existing running narrative:\n${s.running_narrative || "(none yet)"}\n\nOlder check-ins to fold in (Day ${through + 1}–${cutoff}):\n${batchText}\n\nReturn the updated running narrative.`;

      try {
        const completion = await openai.chat.completions.create({
          model: MODEL, temperature: 0.3, max_completion_tokens: 900,
          messages: [
            { role: "system", content: SUMMARISER_SYSTEM },
            { role: "user", content: userMsg },
          ],
        });
        const updated = completion.choices[0].message.content?.trim() || s.running_narrative || "";
        await supabase.from("tracker_sessions").update({
          running_narrative: updated,
          narrative_summarised_through_day: cutoff,
        }).eq("id", s.id);
        result.summarised++;
        result.details.push({ session: s.id, folded_days: `${through + 1}-${cutoff}`, count: batch.length });
      } catch (e) {
        result.errors++;
        console.error(`summarise-old-checkins session ${s.id} error:`, (e as Error)?.message ?? e);
      }
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarise-old-checkins error:", (e as Error)?.message ?? e);
    return new Response(JSON.stringify({ ok: false, error: String(e), ...result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
