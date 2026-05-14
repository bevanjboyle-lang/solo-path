// get-library-content v14 — vibe code review V-054 — 2026-05-14
// V-054: MODULES library now imported from _shared/modules-library.ts. Previously
//        duplicated with generate-guidance's simpler-shaped copy.
//
// get-library-content v13 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { MODULES_LIBRARY as MODULES } from "../_shared/modules-library.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

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


const TRACK_METADATA: Record<string, { name: string; description: string }> = {
  A: { name: "Setup & Structure", description: "The foundational decisions: legal structure, registration, and professional presence." },
  B: { name: "Compliance & Protection", description: "Tax, IR35, contracts, insurance — the essentials before your first engagement." },
  C: { name: "Financial Operations", description: "Invoicing, cash flow, pricing, expenses, and long-term financial planning." },
  D: { name: "Commercial Practice", description: "Pipeline, proposals, client management, and scaling your practice." },
  E: { name: "Sector Specialisms", description: "Sector-specific guidance tailored to your market." },
};

function getTrackEModulesForUser(q3a: string, q11: string): number[] {
  const s = (q3a + ' ' + q11).toLowerCase();
  const ids: number[] = [];
  if (/financial services|banking|insurance|fintech|compliance|risk/.test(s)) ids.push(20);
  if (/public sector|government|nhs|local authority|central government/.test(s)) ids.push(21);
  if (/technology|digital|software|\bdata\b|\btech\b|product manager|product director/.test(s)) ids.push(22);
  if (/healthcare|life sciences|pharma|medical|clinical|\bhealth\b/.test(s)) ids.push(23);
  if (/legal|management consult|strategy consult|\bhr\b|professional services|executive coach/.test(s)) ids.push(24);
  if (/marketing|creative|advertising|\bbrand\b|content|\bdesign\b|communications/.test(s)) ids.push(25);
  return ids;
}

function getRecommendedModuleIds(
  trackerDay: number | null,
  completedIds: number[],
  unlockedIds: number[],
  trackEIds: number[]
): Array<{ module_id: number; tag: string }> {
  const day = trackerDay || 0;

  let priorityList: number[];
  if (day === 0)       priorityList = [1, 2, 3];
  else if (day <= 7)   priorityList = [1, 2, 3, 4, 6];
  else if (day <= 14)  priorityList = [4, 5, 6, 7, 10];
  else if (day <= 21)  priorityList = [8, 9, 11, 12, 15];
  else                 priorityList = [12, 13, 15, 16, 19];

  // Add relevant Track E module
  const uncompletedTrackE = trackEIds.filter(id => unlockedIds.includes(id) && !completedIds.includes(id));
  if (uncompletedTrackE.length > 0) priorityList.push(uncompletedTrackE[0]);

  let available = priorityList.filter(id => unlockedIds.includes(id) && !completedIds.includes(id));

  // Fallback: next uncompleted in sequence
  if (available.length === 0) {
    for (let i = 1; i <= 25; i++) {
      if (unlockedIds.includes(i) && !completedIds.includes(i)) {
        available.push(i);
        if (available.length >= 3) break;
      }
    }
  }

  return available.slice(0, 4).map((id, index) => ({
    module_id: id,
    tag: index === 0 ? "up_next" : "recommended",
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromJwt(req.headers.get("authorization"));
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", response_text: "Authentication required." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const body = await req.json();
    const callType: string = body.call_type || "browse";
    const moduleId: number | null = body.module_id || null;

    // Gather user context in parallel
    const [profileResult, sessionResult, completionsResult, trackerResult, qResult] = await Promise.all([
      supabase.from("user_profiles").select("subscription_active").eq("user_id", userId).single(),
      supabase.from("subscription_sessions").select("modules_unlocked").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("guidance_module_completions").select("module_id, completed_at").eq("user_id", userId),
      supabase.from("tracker_sessions").select("current_day").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("questionnaire_responses").select("answers").eq("user_id", userId).single(),
    ]);

    const subscriptionActive = !!(profileResult.data?.subscription_active);
    const sessionModulesUnlocked: number[] = (sessionResult.data as { modules_unlocked?: number[] } | null)?.modules_unlocked || [];
    const completedModuleIds: number[] = (completionsResult.data || []).map((c: { module_id: number }) => c.module_id);
    const trackerDay: number | null = (trackerResult.data as { current_day?: number } | null)?.current_day || null;
    const answers = ((qResult.data as { answers?: Record<string, unknown> } | null)?.answers) || {};
    const q3a = (answers.q3a_sector as string) || (answers.sector as string) || '';
    const q11 = (answers.q11_sector_client_context as string) || '';

    // Determine unlocked modules
    let unlockedIds: number[];
    if (subscriptionActive && sessionModulesUnlocked.length > 0) {
      unlockedIds = sessionModulesUnlocked;
    } else if (subscriptionActive) {
      // Subscriber but session row not yet created — unlock all A-D + relevant E
      const trackEIds = getTrackEModulesForUser(q3a, q11);
      unlockedIds = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19, ...trackEIds];
    } else {
      // Buyer: check if paid, unlock tranche_1
      const { data: paymentData } = await supabase.from("payments").select("id").eq("user_id", userId).in("status", ["paid", "completed"]).limit(1).single();
      unlockedIds = paymentData ? [1, 2, 3] : [];
    }

    const trackEModuleIds = getTrackEModulesForUser(q3a, q11);

    // ── ARTICLE ───────────────────────────────────────────────────────────────
    if (callType === "article" && moduleId) {
      const mod = MODULES[moduleId];
      if (!mod) {
        return new Response(
          JSON.stringify({ error: "Module not found", response_text: `Module ${moduleId} not found.` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const isCompleted = completedModuleIds.includes(moduleId);
      let completionOutput = null;
      if (isCompleted) {
        const { data: comp } = await supabase
          .from("guidance_module_completions")
          .select("output, completed_at, module_answers")
          .eq("user_id", userId)
          .eq("module_id", moduleId)
          .single();
        completionOutput = comp || null;
      }
      return new Response(
        JSON.stringify({
          module_id: moduleId,
          title: mod.name,
          track: mod.track,
          track_name: TRACK_METADATA[mod.track]?.name || mod.track,
          description: mod.description,
          estimated_minutes: mod.estimated_minutes,
          access_tier: mod.access_tier,
          key_questions: mod.key_questions,
          what_you_get: mod.what_you_get,
          is_unlocked: unlockedIds.includes(moduleId),
          is_completed: isCompleted,
          completion: completionOutput,
          response_text: `Module ${moduleId} loaded.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── TODAY ─────────────────────────────────────────────────────────────────
    if (callType === "today") {
      const recommendations = getRecommendedModuleIds(trackerDay, completedModuleIds, unlockedIds, trackEModuleIds);
      const featured = recommendations.map(rec => {
        const mod = MODULES[rec.module_id];
        return {
          module_id: rec.module_id,
          title: mod.name,
          track: mod.track,
          track_name: TRACK_METADATA[mod.track]?.name || mod.track,
          description: mod.description,
          estimated_minutes: mod.estimated_minutes,
          access_tier: mod.access_tier,
          tag: rec.tag,
          is_completed: completedModuleIds.includes(rec.module_id),
          is_unlocked: unlockedIds.includes(rec.module_id),
        };
      });

      const totalUnlocked = unlockedIds.length;
      const totalCompleted = completedModuleIds.filter(id => unlockedIds.includes(id)).length;
      let progressMessage: string;
      if (totalCompleted === 0) {
        progressMessage = `${totalUnlocked} module${totalUnlocked === 1 ? '' : 's'} available. Start with Track A.`;
      } else if (totalCompleted < totalUnlocked) {
        progressMessage = `${totalCompleted} of ${totalUnlocked} available modules complete.`;
      } else {
        progressMessage = `All ${totalUnlocked} available modules complete.`;
      }

      return new Response(
        JSON.stringify({
          featured,
          progress: { completed: totalCompleted, unlocked: totalUnlocked, message: progressMessage, tracker_day: trackerDay },
          response_text: "Today content loaded.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── BROWSE (default) ─────────────────────────────────────────────────────
    const trackOrder = ["A", "B", "C", "D", "E"] as const;
    const tracks: Record<string, unknown> = {};

    for (const track of trackOrder) {
      const trackModules = Object.entries(MODULES)
        .filter(([, mod]) => mod.track === track)
        .map(([idStr, mod]) => {
          const id = parseInt(idStr);
          return {
            module_id: id,
            title: mod.name,
            description: mod.description,
            estimated_minutes: mod.estimated_minutes,
            access_tier: mod.access_tier,
            is_completed: completedModuleIds.includes(id),
            is_unlocked: unlockedIds.includes(id),
            is_sector_relevant: track === "E" ? trackEModuleIds.includes(id) : true,
          };
        })
        .sort((a, b) => a.module_id - b.module_id);

      // For Track E, put the user's sector module(s) first
      const relevant = track === "E" ? trackModules.filter(m => m.is_sector_relevant) : trackModules;
      const others = track === "E" ? trackModules.filter(m => !m.is_sector_relevant) : [];
      const ordered = [...relevant, ...others];

      tracks[track] = {
        track_id: track,
        ...TRACK_METADATA[track],
        modules: ordered,
        completed_count: ordered.filter(m => m.is_completed).length,
        total_count: ordered.length,
      };
    }

    return new Response(
      JSON.stringify({
        tracks,
        completed_module_ids: completedModuleIds,
        unlocked_module_ids: unlockedIds,
        track_e_relevant_ids: trackEModuleIds,
        response_text: "Library browse content loaded.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("get-library-content error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error), response_text: "Failed to load library content." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
