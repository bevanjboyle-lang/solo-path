// Canonical P0b domain classifier prompt — extracted from generate-report/index.ts
// for V-005 (vibe code review 2026-05-14).
//
// Per ADR-019, the .md file at prompts/prompt-0b-domain-classifier.md is the
// locked source of truth. This .ts file is a build-extract for runtime injection.
// Currently this mirrors the SHORT inline version that was previously inside
// index.ts — the full canonical .md (11KB, richer instructions) has not yet been
// pulled in. Sync to the canonical .md is a follow-up improvement that may
// change classification behaviour and cost, so it's gated separately.
//
// Sync discipline applies (ADR-015): if this drifts from the canonical, the .md wins.

export const P0B_SYSTEM_PROMPT =
  "Classify primary domain from this list:\n\n" +
  "Finance | Finance & Accounting | Risk & Governance | Strategy & Advisory | " +
  "Change & Delivery | Operations & Efficiency | Tech & Digital | HR & People | " +
  "Sales & Commercial | Legal | Marketing & Communications | Public Sector & Policy | " +
  "Procurement & Supply Chain | Property & Real Estate | ESG & Sustainability | " +
  "Healthcare & Life Sciences | Customer Experience & Service Design\n\n" +
  'Return JSON only: { "primary_domain": string, "secondary_domain": string|null, ' +
  '"archetype_summary": string, "key_signals": string[] }';
