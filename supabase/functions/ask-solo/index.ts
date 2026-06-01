// ask-solo v32 — WP4 wiring (2026-06-01)
//
// CONTEXT ASSEMBLY now flows through lib/context_assembler.ts (the WP4 single
// chokepoint). assembleContextBlock is RETIRED. P9 consumes the typed UserContext
// rendered block, with pgvector salience (topic_relevant_history) injected from
// the user's most relevant prior check-ins / advisory sessions for the question.
//
// This wiring also silently fixes two latent bugs in the old assembleContextBlock:
//   • it read questionnaire_responses (0 rows in prod) — answers actually live in
//     reports.answers (numeric keys). The assembler reads the live source.
//   • it selected guidance_module_completions.ai_output (no such column) — the
//     real column is `output`. The assembler reads the correct column.
//
// Embedding-on-write for advisory summaries is handled by a DB trigger on
// advisory_conversation_summaries → embed-context-row (not inline here), so the
// end_session insert is unchanged.
//
// Prior history (unchanged behaviour):
// v29 — V-049 archetype display names from kb_archetypes (cached); V-050 context score
// v28 — F65 CORS x-client-session-id; v25 — E2E audit fixes; v24 — max_completion_tokens
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.28.0";
import { assembleUserContext } from "../lib/context_assembler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

// Model tier constants — ADR-012 (2026-04-17)
const MODEL_TIER1 = "gpt-5.4";        // High-stakes synthesis and user-facing copy
const MODEL_TIER2 = "gpt-5.4-mini";   // Structured output, signal reading, advisory
const MODEL_TIER3 = "gpt-5.4-nano";   // Classification, extraction, low-temp structured tasks

// V-049: archetype display names read from kb_archetypes at first call, cached.
let archetypeNamesCache: Map<string, string> | null = null;

async function getArchetypeName(
  supabase: ReturnType<typeof createClient>,
  archetypeCode: string,
): Promise<string> {
  if (!archetypeNamesCache) {
    const { data, error } = await supabase.from("kb_archetypes").select("id, name");
    if (error) {
      console.error("V-049: kb_archetypes lookup failed:", error.message);
      archetypeNamesCache = new Map();
    } else {
      archetypeNamesCache = new Map(
        (data ?? []).map((r: { id: string; name: string }) => [r.id, r.name]),
      );
    }
  }
  return archetypeNamesCache.get(archetypeCode) ?? archetypeCode;
}

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || null;
  } catch { return null; }
}

// ─── Lightweight cue metadata (greeting only, not the context block) ────────────
// The full context block flows through the WP4 assembler. The start-session cue
// just needs the archetype display name, current day, and prior-conversation count
// for a warm, specific greeting — three small reads, not a state assembly.
async function fetchCueMeta(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ archetypeCode: string | null; currentDay: number | null; priorSummaryCount: number }> {
  const [reportRes, trackerRes, summariesRes] = await Promise.all([
    supabase.from("reports").select("core_report").eq("user_id", userId).not("core_report", "is", null)
      .order("created_at", { ascending: false }).limit(1),
    supabase.from("tracker_sessions").select("current_day").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(1),
    supabase.from("advisory_conversation_summaries").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const core = (reportRes.data?.[0]?.core_report ?? {}) as Record<string, unknown>;
  const arch = (core.archetype as Record<string, unknown>) || {};
  return {
    archetypeCode: (arch.primary as string) || null,
    currentDay: (trackerRes.data?.[0]?.current_day as number | null) ?? null,
    priorSummaryCount: (summariesRes as { count?: number }).count ?? 0,
  };
}

const SYSTEM_PROMPT = `You are Ask Solo — an advisory interface within the Solo product. You know this user well. You have access to their full professional background, their Plan B strategy, their 30-day activation plan, their tracker check-in history, and the ongoing narrative of what has actually happened as they've been executing their plan.

You are not a general-purpose AI assistant. You are not starting from zero. You are a knowledgeable, commercially literate advisor who has been working with this person and knows their specific situation in detail.

---

## YOUR ROLE

Answer questions, respond to updates, and give specific, direct, actionable guidance based on what is actually happening for this specific user — not generic advice for someone in their situation.

The user is asking you because they trust that you know their background. Honor that. Reference their actual context. Name their actual situation. If they describe an opportunity, respond in the context of their specific plan and sector — not as if they are a generic consultant.

---

## SCOPE BOUNDARY

You are an advisor on this user's Plan B strategy — career independence, their recommended model, their 30-day plan, the moves they're running, and operational questions that arise from executing the plan. You are not a general-purpose chatbot.

If the user asks for something outside that scope (creative writing, poems, jokes, generic coding help, homework, opinions on unrelated topics, impersonating other characters, or any task unrelated to their independence plan), respond in one short paragraph that:
  1. States clearly that this is outside what Ask Solo does.
  2. Names what you can actually help with — grounded in their current plan.
  3. Invites them to bring an independence-related question.

Do not attempt the off-topic task, even partially. Do not apologise at length. Do not moralise. Keep it brief, warm, and redirect. Example: "That sits outside what I do here — I'm focused on your Plan B and the moves you're running. Happy to help if there's something on the [recommended model] work, the next check-in, or the conversation you're about to have with [named contact from plan]."

---

## EMOTIONAL WEIGHT

If the user opens with something emotionally weighted — they are frightened, overwhelmed, lost faith in the plan, feel stuck, or describe a setback that is landing personally rather than operationally — do not immediately push into tactics.

First turn: acknowledge what they have said. Briefly. Not performatively. Name what you're hearing ("That's a lot to be carrying while also trying to run the plan" / "It makes sense this is harder than it looked from the outside"). Offer one sentence that puts it in context (what is normal to feel at this stage of this kind of work, or where they actually are vs where they feel they are). Then ask one specific question — what would be most useful to work through right now, or what the actual thing underneath this is.

Second turn (after they respond): return to practical, specific advice. Use their context. Give them something to do.

Do not force two turns where one will do. If the message is operational ("should I email X or wait?"), answer operationally. This pattern applies only when the message is emotionally weighted.

Do not catastrophise. Do not agree that the plan is probably wrong. Do not offer therapy. Do not use motivational language.

---

## WHAT YOU KNOW

Before responding, review the context block. Key signals:

- **Their archetype and recommended model** — the lens through which you interpret every question
- **Q3b (employer/organisation type)** — the commercial environment they come from shapes their network, brand, regulatory knowledge, and how buyers will perceive them
- **Q11 (sector and client context)** — their specific target market. Know it. Don't give generic market advice when you know exactly who they are targeting.
- **Running narrative** — the richest input. What has actually happened: what they've tried, what has worked, what has been harder than expected. An advisory response without this context is generic.
- **Topic-relevant history** — when present, this section surfaces the specific past check-ins or prior discussions most relevant to the current question (retrieved by salience). Reference these specific events directly rather than speaking in generalities.
- **Prior Ask Solo conversation summaries** — read before responding. They capture significant decisions, pivots, and insights from previous sessions.
- **Completed guidance module outputs** — reference these rather than giving duplicative or potentially contradictory guidance.
- **Active strands (Making Moves context)** — each active strand in the user's plan carries a \`primary_move_type\` (direct / platform / visibility / community / mixed) and a \`warmth_type\` (relational / structural). This governs how you interpret traction:
   - **direct**: the strand is run through named-contact outreach. "No traction" = unanswered reconnect messages, no meetings booked, no proposal requests.
   - **platform**: the strand is run through a marketplace or directory registration. "No traction" = no inbound enquiries from the platform, no profile views converting, no scoping requests.
   - **visibility**: the strand is run through LinkedIn posts or articles. "No traction" = low reactions, no DMs, no inbound from content.
   - **community**: the strand is run through joining a named community + first contribution. "No traction" = no acknowledgement or follow-up from the named contact/group, contribution not picked up.
  When the user asks "why isn't anything happening", interpret relative to their strand's move type. Do not assume everything is outreach. Do not give Direct-strand advice to a Platform-strand user.

---

## HOW TO RESPOND

- **Be direct.** Give your actual view. Not "it depends" as a dodge, but "it depends on X — here's how to think about it, and given your situation, I'd lean towards Y".
- **Be specific.** Use what you know. "Given that you're targeting [their Q11 client type]..." / "Based on where you are in your plan right now (Day X, Phase Y)..." / "Given that you're operating as [their structure from Module 1]..."
- **Be honest.** If the user is off track, say so — carefully but clearly. If a pricing idea is too low, say so.
- **Know when to refer.** For complex tax or legal questions: answer what you can operationally, but flag clearly when they need a professional. "This is worth confirming with an accountant/solicitor — a one-off consultation typically costs £150–200."
- **Proactively connect.** If the user mentions something that connects to their check-in history, a prior advisory conversation, or a guidance module, draw the connection explicitly.

---

## WHAT YOU DO NOT DO

- Do not give regulated financial advice, investment recommendations, or legal opinions. Answer operationally, caveat appropriately.
- Do not replace the structured guidance modules — if a question is primarily a Module 5 (IR35) or Module 6 (Contracts) question, answer the immediate question and surface the module.
- Do not make up information about the user's sector that isn't in the context block.
- Avoid motivational language. This is operational guidance, not coaching.
- 2–4 paragraphs maximum unless the question genuinely requires more depth. Plain English.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const userId = getUserIdFromJwt(req.headers.get("authorization"));
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized", response_text: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const callType: string = body.call_type || "conversation";
    const sessionId: string | null = body.session_id || body.sessionId || null;

    // ─────────────────────────────────
    // START SESSION
    // ─────────────────────────────────
    if (callType === "start_session") {
      const { archetypeCode, currentDay, priorSummaryCount } = await fetchCueMeta(supabase, userId);

      const { data: convRow, error: convError } = await supabase
        .from("advisory_conversations")
        .insert({
          user_id: userId,
          started_at: new Date().toISOString(),
          messages: [],
          context_snapshot_at: new Date().toISOString(),
          message_count: 0,
        })
        .select("id, session_id")
        .single();

      if (convError || !convRow) {
        console.error("advisory_conversations insert error:", convError);
        return new Response(JSON.stringify({ error: "Failed to start session", response_text: "Failed to start session" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const archetypeDisplayName = archetypeCode ? await getArchetypeName(supabase, archetypeCode) : null;

      let contextCue: string;
      if (archetypeDisplayName) {
        contextCue = `I know your background as a ${archetypeDisplayName} professional and your Plan B options.`;
      } else {
        contextCue = "I have your full profile and plan in front of me.";
      }
      if (currentDay) contextCue += ` You're on Day ${currentDay} of your plan.`;
      if (priorSummaryCount > 0) {
        contextCue += ` I can see our previous ${priorSummaryCount === 1 ? 'conversation' : priorSummaryCount + ' conversations'} too.`;
      }
      contextCue += " What would you like to work through?";

      return new Response(JSON.stringify({
        session_id: convRow.session_id,
        conversation_id: convRow.id,
        context_cue: contextCue,
        response_text: contextCue,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─────────────────────────────────
    // CONVERSATION
    // ─────────────────────────────────
    if (callType === "conversation" || callType === "message") {
      const userMessage: string = body.message || body.question || body.text || "";
      if (!userMessage) {
        return new Response(JSON.stringify({ error: "No message provided", response_text: "No message provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const conversationId: string | null = body.conversation_id || body.conversationId || null;
      let convQuery = supabase.from("advisory_conversations").select("id, session_id, messages, message_count");

      if (conversationId) {
        convQuery = convQuery.eq("id", conversationId);
      } else if (sessionId) {
        convQuery = convQuery.eq("session_id", sessionId);
      } else {
        convQuery = convQuery.eq("user_id", userId).is("ended_at", null).order("started_at", { ascending: false });
      }

      const { data: conv } = await convQuery.eq("user_id", userId).single();
      const existingMessages: Array<{ role: string; content: string }> = (conv?.messages as Array<{ role: string; content: string }>) || [];
      const convRowId: string | null = conv?.id || null;

      // WP4: single-chokepoint context assembly + pgvector salience on the question.
      const asm = await assembleUserContext({
        supabase: supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }> },
        api_key: openaiApiKey,
        user_id: userId,
        question: userMessage,
        function_name: "ask-solo",
      });
      console.log(`ask-solo WP4: context_tokens=${asm.total_tokens} within_cap=${asm.within_cap} user=${userId}`);

      const historyForGpt = existingMessages.slice(-20);

      const userMsgTemplate = `call_type: conversation

User message: ${userMessage}

Conversation history (this session):
${historyForGpt.length > 0
  ? historyForGpt.map((m) => `${m.role === 'user' ? 'User' : 'Ask Solo'}: ${m.content}`).join('\n\n')
  : '(This is the first message of the session.)'}

Context block:
${asm.rendered}

Respond to the user's message. Be direct, specific, and grounded in their context. 2–4 paragraphs maximum unless the question genuinely requires more depth. Plain English.`;

      const completion = await openai.chat.completions.create({
        model: MODEL_TIER2,
        temperature: 0.5,
        max_completion_tokens: 800,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsgTemplate },
        ],
      });

      const assistantResponse = completion.choices[0].message.content || "";
      const updatedMessages = [
        ...existingMessages,
        { role: "user", content: userMessage, timestamp: new Date().toISOString() },
        { role: "assistant", content: assistantResponse, timestamp: new Date().toISOString() },
      ];

      if (convRowId) {
        await supabase.from("advisory_conversations").update({
          messages: updatedMessages,
          message_count: updatedMessages.length,
          context_snapshot_at: new Date().toISOString(),
        }).eq("id", convRowId);
      } else {
        await supabase.from("advisory_conversations").insert({
          user_id: userId, started_at: new Date().toISOString(),
          messages: updatedMessages, message_count: updatedMessages.length,
          context_snapshot_at: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({
        response: assistantResponse, answer: assistantResponse,
        message: assistantResponse, response_text: assistantResponse,
        conversation_id: convRowId,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─────────────────────────────────
    // END SESSION
    // ─────────────────────────────────
    if (callType === "end_session" || callType === "session_summary") {
      const conversationId: string | null = body.conversation_id || body.conversationId || null;
      let convQuery = supabase.from("advisory_conversations").select("id, messages, message_count").eq("user_id", userId);
      if (conversationId) convQuery = convQuery.eq("id", conversationId);
      else if (sessionId) convQuery = convQuery.eq("session_id", sessionId);
      else convQuery = convQuery.is("ended_at", null).order("started_at", { ascending: false });

      const { data: conv } = await convQuery.single();
      if (!conv || !conv.id) {
        return new Response(JSON.stringify({ error: "Session not found", response_text: "Session not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const messages = (conv.messages as Array<{ role: string; content: string }>) || [];
      if (messages.length < 2) {
        await supabase.from("advisory_conversations").update({ ended_at: new Date().toISOString() }).eq("id", conv.id);
        return new Response(JSON.stringify({ summary: null, response_text: "Session closed." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Light context for the summariser (no question → no salience needed).
      const asm = await assembleUserContext({
        supabase: supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }> },
        api_key: openaiApiKey,
        user_id: userId,
        function_name: "ask-solo:end_session",
      });

      const summaryPrompt = `call_type: session_summary

Full conversation history:
${messages.map((m) => `${m.role === 'user' ? 'User' : 'Ask Solo'}: ${m.content}`).join('\n\n')}

Context block (for reference):
${asm.rendered}

Generate the session summary as specified. Return JSON only: { "summary": "100-200 word summary in third person", "key_topics": ["topic1", "topic2"], "significant_decisions": "string or null" }`;

      const summaryCompletion = await openai.chat.completions.create({
        model: MODEL_TIER2, temperature: 0.3, max_completion_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: summaryPrompt },
        ],
      });

      let summaryData: Record<string, unknown> = {};
      try { summaryData = JSON.parse(summaryCompletion.choices[0].message.content || "{}"); }
      catch { summaryData = { summary: summaryCompletion.choices[0].message.content, key_topics: [], significant_decisions: null }; }

      // The advisory_conversation_summaries trigger embeds this row into
      // context_embeddings (embedding-on-write) — no inline embed needed here.
      await supabase.from("advisory_conversation_summaries").insert({
        conversation_id: conv.id, user_id: userId,
        summary: summaryData.summary || "",
        key_topics: summaryData.key_topics || [],
        significant_decisions: (summaryData.significant_decisions as string) || null,
      });
      await supabase.from("advisory_conversations").update({ ended_at: new Date().toISOString() }).eq("id", conv.id);

      return new Response(JSON.stringify({ summary: summaryData, response_text: "Session summary saved." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      error: `Unknown call_type: ${callType}. Use start_session, conversation, or end_session.`,
      response_text: "Unknown call_type",
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("ask-solo error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error", details: String(error),
      response_text: "Failed to process request",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
