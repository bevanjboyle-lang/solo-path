// rehearse-buyer — Rehearsal Room v1 (ADR-025, 2026-06-11)
// FUNCTION_VERSION: rehearse-buyer-v1.0
//
// Simulated-buyer roleplay inside Ask Solo. The model plays a realistic UK
// buyer of the user's primary strand's service: specific organisation type,
// sceptical but fair, never breaks character. When the user sends
// "END REHEARSAL" (or the transcript exceeds 20 messages) it steps out of
// character and returns a short direct debrief: what worked, what to tighten,
// one line to steal.
//
// Stateless: the client sends the running transcript on every call. An empty
// transcript means "open the conversation as the buyer".
//
// verify_jwt: true — gateway-verified JWT, identity via supabase.auth.getUser
// (per the 2026-06-10 security review: no inline-decode identity).
// Paid gate: latest report status in ('pending_selection','generating_plan','complete').
// Model: gpt-5.4 — conversation quality is the product here.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const PAID_STATUSES = ["pending_selection", "generating_plan", "complete"];
const SCENARIOS = ["discovery_call", "pricing_pushback"] as const;
type Scenario = (typeof SCENARIOS)[number];

const MAX_TRANSCRIPT = 20;
const MAX_MESSAGE_CHARS = 4000;

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buyerSystemPrompt(opts: {
  scenario: Scenario;
  strandTitle: string;
  targetBuyer: string;
  positioning: string;
  archetype: string;
}): string {
  const scenarioBrief =
    opts.scenario === "discovery_call"
      ? `SCENARIO: a first discovery call. You agreed to a short exploratory conversation after a colleague mentioned this person. You have a real problem in this area but you are not yet convinced you need outside help, and you have been burned by consultants before. You want to understand what they actually do, what it costs in time and money, and whether they have done this for organisations like yours. Open guarded; warm up only if they earn it with specifics.`
      : `SCENARIO: pricing pushback. You have had one good conversation with this person and you want the work done, but the price they quoted feels high. You have a cheaper alternative quote, an internal option, and a finance director asking hard questions. Push on the number: ask what you actually get, why it costs that, what could be trimmed. You are negotiating in good faith, not bluffing, and you can be persuaded by a confident, specific defence of value. Cave only if they earn it.`;

  return `You are roleplaying a realistic UK buyer in a sales rehearsal. The person you are speaking with is a mid-career professional starting an independent line of work. Their background profile: ${opts.archetype || "senior professional"}.

What they sell: ${opts.strandTitle}.
${opts.positioning ? `How they position it: ${opts.positioning}` : ""}
${opts.targetBuyer ? `Their typical buyer: ${opts.targetBuyer}` : ""}

YOUR CHARACTER: you are that typical buyer. Invent ONE specific, plausible organisation (give it a name, a size, a sector consistent with the typical-buyer description) and a specific role for yourself, and stay consistent with both for the whole conversation. You are sceptical but fair: busy, commercially sharp, allergic to vagueness and jargon, but genuinely persuadable by specifics, evidence and a straight answer.

${scenarioBrief}

RULES:
- Stay in character at all times. Never mention being an AI, a simulation, or a rehearsal.
- UK business register. Plain, direct speech. No hype. No em dashes.
- Keep each reply short: two to five sentences, the way real buyers talk on calls. One question or objection at a time.
- React to what they actually said. Reward specificity; punish waffle with scepticism.
- If the transcript is empty, open the conversation yourself with a brief, realistic opener in character.
- The ONLY exception to character: if the user sends "END REHEARSAL", a separate debrief will be produced. Do not produce the debrief yourself mid-conversation.`;
}

function debriefSystemPrompt(opts: {
  scenario: Scenario;
  strandTitle: string;
  reason: "ended" | "capped";
}): string {
  return `You are Solo, a direct, commercially grounded UK career adviser. A user has just finished rehearsing a ${
    opts.scenario === "discovery_call" ? "buyer discovery call" : "pricing pushback conversation"
  } for their service (${opts.strandTitle}). The transcript follows: "assistant" messages are the simulated buyer, "user" messages are the person rehearsing.${
    opts.reason === "capped"
      ? " The rehearsal hit its length limit, so close it off politely before the debrief (one short sentence)."
      : ""
  }

Step fully out of the buyer character and give a short, direct debrief of the USER's performance:

**What worked** (two or three specific points, quoting or paraphrasing their actual words)
**What to tighten** (two or three specific points, with what to say instead)
**One line to steal** (a single ready-to-use sentence they could take into the real conversation)

Rules: UK English. Direct and specific, no motivational language, no hype, no em dashes. Under 200 words. If the user barely said anything, say so plainly and suggest what a strong opening would have been.`;
}

async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4",
      messages,
      max_completion_tokens: 700,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned an empty completion");
  }
  return content.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) {
      return json({ response_text: "Sign in to use the Rehearsal Room." }, 401);
    }
    const userId = userData.user.id;

    // ── Input validation ──
    let body: { messages?: unknown; scenario?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ response_text: "Invalid request body." }, 400);
    }
    const scenario = body.scenario as Scenario;
    if (!SCENARIOS.includes(scenario)) {
      return json({ response_text: "Unknown scenario." }, 400);
    }
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const transcript: TranscriptMessage[] = [];
    for (const m of rawMessages) {
      const role = (m as { role?: unknown })?.role;
      const content = (m as { content?: unknown })?.content;
      if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
        transcript.push({ role, content: content.slice(0, MAX_MESSAGE_CHARS) });
      }
    }

    // ── Paid gate + strand/archetype context ──
    const { data: report } = await supabase
      .from("reports")
      .select("id, status, core_report, selected_strands")
      .eq("user_id", userId)
      .in("status", PAID_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!report) {
      return json(
        { response_text: "The Rehearsal Room unlocks with your report.", gated: true },
        403,
      );
    }

    // Primary strand: first selected strand if the user has chosen; otherwise
    // the report's top option (paid users in pending_selection can rehearse too).
    type StrandLike = {
      model_name?: string;
      option?: { target_buyer?: string; positioning?: string };
      target_buyer?: string;
      positioning?: string;
    };
    const selected: StrandLike[] = Array.isArray(report.selected_strands)
      ? (report.selected_strands as StrandLike[])
      : [];
    const options: StrandLike[] = Array.isArray(report.core_report?.options)
      ? (report.core_report.options as StrandLike[])
      : [];
    const primary: StrandLike | undefined = selected[0] ?? options[0];
    const strandTitle = primary?.model_name ?? "their professional service";
    const targetBuyer = primary?.option?.target_buyer ?? primary?.target_buyer ?? "";
    const positioning = primary?.option?.positioning ?? primary?.positioning ?? "";
    const archetype = report.core_report?.archetype?.primary ?? "";

    // ── Mode: in-character buyer, or debrief ──
    const lastUser = [...transcript].reverse().find((m) => m.role === "user");
    const endedByUser =
      !!lastUser && lastUser.content.trim().toUpperCase() === "END REHEARSAL";
    const capped = transcript.length > MAX_TRANSCRIPT;
    const debrief = endedByUser || capped;

    const systemPrompt = debrief
      ? debriefSystemPrompt({
          scenario,
          strandTitle,
          reason: endedByUser ? "ended" : "capped",
        })
      : buyerSystemPrompt({ scenario, strandTitle, targetBuyer, positioning, archetype });

    // For the debrief, drop the END REHEARSAL sentinel from what the model reviews.
    const llmTranscript = (debrief
      ? transcript.filter((m) => m.content.trim().toUpperCase() !== "END REHEARSAL")
      : transcript
    ).slice(-MAX_TRANSCRIPT);

    const reply = await callOpenAI([
      { role: "system", content: systemPrompt },
      ...llmTranscript,
    ]);

    return json({ response_text: reply, ended: debrief });
  } catch (e) {
    console.error("rehearse-buyer error:", e);
    return json(
      { response_text: "The rehearsal couldn't continue just now. Try again in a minute.", error: true },
      500,
    );
  }
});
