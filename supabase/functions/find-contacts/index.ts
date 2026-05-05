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

    console.log("find-contacts v1: querying Apollo People Search", {
      person_titles: apollo_query.person_titles,
      sector_keywords: apollo_query.sector_keywords,
      location: apollo_query.location,
    });

    const apolloResponse = await fetch("https://api.apollo.io/v1/mixed_people/search", {
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
      // Degrade gracefully — do not fail the whole task view
      return new Response(
        JSON.stringify({
          contacts: [],
          total: 0,
          response_text: "Could not find contacts right now. Try again in a moment.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apolloData = await apolloResponse.json();
    const people: Array<Record<string, unknown>> = apolloData.people || [];

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

    console.log(`find-contacts v1: returned ${contacts.length} contacts`);

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
    console.error("find-contacts v1 error:", error);
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
