/**
 * Feature flags — small, manually flipped, compile-time constants.
 *
 * We deliberately don't (yet) use a remote config store. The set of features
 * gated this way is small and the lifecycle is "build → flip at launch →
 * delete the flag". Anything more elaborate is overengineering at our scale.
 *
 * To flip a flag in production:
 *   1. Verify the prerequisites in the flag's docstring are met
 *   2. Change the constant here
 *   3. Commit + push (Vercel auto-deploys)
 *   4. Live-smoke the affected surface
 *   5. Once confirmed, the flag can be deleted in a follow-up
 */

/**
 * Apollo named-contact lookup feature.
 *
 * `false` until we upgrade the Apollo account from Free to a paid tier that
 * grants API access for the People Search endpoint. Free Apollo accounts
 * return HTTP 403 with `error_code: "API_INACCESSIBLE"` on every call to
 * `/api/v1/mixed_people/api_search`, which would surface as a dead-end empty
 * picker on cold outreach tasks. Hiding the "Find named contacts" button
 * keeps the cold-task UX identical to the warm-task UX in the meantime.
 *
 * Flip to `true` ONLY after all of the following are true:
 *   1. Apollo plan upgraded from Free to a paid tier with API access enabled
 *      (Basic plan typically — confirm API access is in the package, not all
 *      paid tiers include it). https://app.apollo.io/#/settings/plans
 *   2. APOLLO_API_KEY in Supabase secrets matches the developer-portal key
 *      at https://developer.apollo.io/#/api-keys (legacy SaaS keys do NOT
 *      authorise the api_search endpoint even when valid)
 *   3. A live invocation of find-contacts returns at least one named contact
 *      (Supabase logs show "find-contacts v15: returned N contacts" with N>0)
 *
 * Reference:
 *   - admin/apollo-sprint-design.md (sprint design)
 *   - find-contacts v15+ (handles API_INACCESSIBLE as defence-in-depth)
 *   - Memory: project_apollo_integration_wired.md
 *   - Confirmed gated 2026-05-06 via Supabase logs (HTTP 403 from Apollo
 *     `/api/v1/mixed_people/api_search` with the user's free-tier API key)
 */
export const APOLLO_ENABLED = false;
