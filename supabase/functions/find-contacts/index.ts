// find-contacts v16 — 2026-05-06: detect Apollo API_INACCESSIBLE (free-plan paywall)
//
// Confirmed via Supabase logs 2026-05-06 that Apollo's free tier returns:
//   HTTP 403
//   { "error":"api/v1/mixed_people/api_search is not accessible with this api_key on a free plan...",
//     "error_code":"API_INACCESSIBLE" }
// for ALL calls to /api/v1/mixed_people/api_search. The 100 credits visible in
// developer.apollo.io are for the dashboard search UI, not API access. The
// api_search endpoint is fully paywalled on free.
//
// v16 detects API_INACCESSIBLE specifically and surfaces a precise response_text
// so the frontend can show "Named contact lookup launches with the paid version"
// instead of the generic "Could not find contacts right now". Defence-in-depth:
// the frontend now hides the button entirely behind the APOLLO_ENABLED feature
// flag (src/lib/featureFlags.ts), so this path should not normally be reached
// in production. It exists for the case where the flag is flipped before the
// Apollo plan is actually upgraded.
//
// find-contacts v15 — 2026-05-05: defensive response parsing + diagnostic logging
//
// v15 adds:
//   - Defensive `apolloData.contacts` fallback when `people` is missing (in
//     case Apollo's api_search uses a different top-level key for results).
//   - Logs Apollo response shape (top-level keys, people/contacts counts,
//     pagination) to help debug empty-result cases.
//   - Logs a 500-char sample of the raw Apollo body when the parsed contacts
//     list is empty. Distinguishes "Apollo returned 0 matches" from "Apollo
//     returned data in a shape we don't recognise".
//
// find-contacts v14 — 2026-05-05: switch to credit-free /api/v1/mixed_people/api_search
//
// Endpoint changed from /v1/mixed_people/search (older dashboard endpoint that
// consumed 1 Apollo credit per contact returned, and is the path triggering the
// "API key in URL parameters will be deprecated" deprecation notice when used
// from the Apollo web app) to /api/v1/mixed_people/api_search (the dedicated
// API endpoint that does NOT consume credits for searches). Same auth pattern
// (x-api-key header), same request body shape, same response shape — strictly
// an upgrade. Free-tier accounts can now search without burning credits.
//
// Refs:
//   - https://docs.apollo.io/reference/people-api-search (canonical endpoint)
//   - admin/apollo-sprint-design.md
//
// find-contacts v13 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
// find-contacts v1 — Apollo.io People Search wrapper
// Part of the Apollo Contact Finding sprint (admin/apollo-sprint-design.md)
//
// Accepts an apollo_query object (from generate-plan v15 cold outreach tasks),
// queries Apollo.io People Search API, returns up to 8 named contacts.
//
// Pre-requisite: APOLLO_API_KEY must be set as a Supabase secret.
// Without it, returns { contacts: [], response_text: 'Contact finding is not yet available.' } gracefully.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload.sub || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromJwt(req.headers.get("authorization"));
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", contacts: [], response_text: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { apollo_query } = await req.json();

    if (!apollo_query) {
      return new Response(
        JSON.stringify({ error: "apollo_query is required", contacts: [], response_text: "apollo_query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apolloApiKey = Deno.env.get("APOLLO_API_KEY");

    if (!apolloApiKey) {
      console.error("APOLLO_API_KEY secret not set — contact finding unavailable");
      return new Response(
        JSON.stringify({
          contacts: [],
          total: 0,
          response_text: "Contact finding is not yet available. APOLLO_API_KEY not configured.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Apollo People Search payload
    const searchBody: Record<string, unknown> = {
      page: 1,
      per_page: 8,
      prospected_by_current_team: "no",
    };

    if (Array.isArray(apollo_query.person_titles) && apollo_query.person_titles.length > 0) {
      searchBody.person_titles = apollo_query.person_titles;
    }
    if (apollo_query.sector_keywords && typeof apollo_query.sector_keywords === "string") {
      searchBody.q_keywords = apollo_query.sector_keywords;
    }
    if (apollo_query.location && typeof apollo_query.location === "string") {
      searchBody.person_locations = [apollo_query.location];
    }
    if (Array.isArray(apollo_query.seniority_levels) && apollo_query.seniority_levels.length > 0) {
      searchBody.person_seniorities = apollo_query.seniority_levels;
    }
    if (Array.isArray(apollo_query.company_size_ranges) && apollo_query.company_size_ranges.length > 0) {
      searchBody.organization_num_employees_ranges = apollo_query.company_size_ranges;
    }

    console.log("find-contacts v14: querying Apollo People Search (credit-free api_search endpoint)", {
      person_titles: apollo_query.person_titles,
      sector_keywords: apollo_query.sector_keywords,
      location: apollo_query.location,
    });

    // /api/v1/mixed_people/api_search is the dedicated API endpoint and does
    // NOT consume Apollo credits per contact returned (vs /v1/mixed_people/search
    // which does). Same auth + body shape.
    const apolloResponse = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apolloApiKey,
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(searchBody),
    });

    if (!apolloResponse.ok) {
      const errorText = await apolloResponse.text();
      console.error("Apollo API error:", apolloResponse.status, errorText);

      // Detect Apollo's "free plan can't access this endpoint" error code so
      // we can surface a precise message. Apollo's response body for this case:
      //   { "error":"...not accessible with this api_key on a free plan...",
      //     "error_code":"API_INACCESSIBLE" }
      let parsedError: { error?: string; error_code?: string } = {};
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        // Body wasn't JSON — fall through to generic handling
      }
      const isPlanGated =
        apolloResponse.status === 403 &&
        parsedError.error_code === "API_INACCESSIBLE";

      // Degrade gracefully — do not fail the whole task view
      return new Response(
        JSON.stringify({
          contacts: [],
          total: 0,
          apollo_status: apolloResponse.status,
          apollo_error_code: parsedError.error_code ?? null,
          response_text: isPlanGated
            ? "Named contact lookup launches with the paid version. The draft is still ready to use."
            : "Could not find contacts right now. Try again in a moment.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apolloData = await apolloResponse.json();
    // Defensive: Apollo's api_search endpoint historically returns matched
    // people under `people`, but some response variants use `contacts`. Try
    // both before giving up.
    const peopleRaw =
      (Array.isArray(apolloData?.people) && apolloData.people) ||
      (Array.isArray(apolloData?.contacts) && apolloData.contacts) ||
      [];
    const people: Array<Record<string, unknown>> = peopleRaw;

    // Log what we got back from Apollo for diagnostic purposes — top-level
    // keys + counts. This lets us distinguish a 200-OK-but-empty response
    // (genuine 0 matches) from a 200-OK-but-different-shape response (Apollo
    // changed something under us).
    const topLevelKeys = apolloData && typeof apolloData === "object"
      ? Object.keys(apolloData)
      : [];
    const pagination = (apolloData as { pagination?: Record<string, unknown> })?.pagination ?? null;
    console.log("find-contacts v14: Apollo response shape", {
      http_status: apolloResponse.status,
      top_level_keys: topLevelKeys,
      people_count: Array.isArray(apolloData?.people) ? apolloData.people.length : null,
      contacts_count: Array.isArray(apolloData?.contacts) ? apolloData.contacts.length : null,
      pagination,
    });

    const contacts = people
      .filter((p) => p.name && p.title)
      .map((p) => ({
        id: p.id as string,
        first_name: p.first_name as string,
        last_name: p.last_name as string,
        name: p.name as string,
        title: p.title as string,
        company: (p.organization as Record<string, unknown>)?.name as string ?? null,
        linkedin_url: (p.linkedin_url as string) ?? null,
      }));

    if (contacts.length === 0) {
      // Surface a sample of the raw response body so we can understand WHY
      // Apollo didn't return matches. Capped at 500 chars so we don't blow up
      // log volume on a populated response that happened to filter to zero.
      const sample = JSON.stringify(apolloData).slice(0, 500);
      console.log("find-contacts v14: empty result — apollo response sample:", sample);
    }
    console.log(`find-contacts v14: returned ${contacts.length} contacts`);

    return new Response(
      JSON.stringify({
        contacts,
        total: contacts.length,
        response_text: contacts.length > 0
          ? `Found ${contacts.length} contacts matching your target profile.`
          : "No contacts found for this profile. The draft is still ready to use.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("find-contacts v14 error:", error);
    return new Response(
      JSON.stringify({
        contacts: [],
        total: 0,
        response_text: "Could not find contacts. Please try again.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
