// V-036 + V-054 (vibe code review 2026-05-14): single source of truth for
// constants previously duplicated across edge functions.
//
// Supabase convention: any folder under supabase/functions/ prefixed with
// underscore (e.g. _shared) is not deployed as a function. The Supabase CLI
// bundles imports from such folders into each function that imports them, so
// updates here propagate to every consumer on next deploy.
//
// To import from a function:
//   import { TRANCHE_1_MODULES } from "../_shared/constants.ts";

// Modules unlocked when a buyer completes the one-time £19.99 Plan B Report
// purchase. Was duplicated in payment-webhook (v26) and exchange-payment-token
// (v5) before consolidation here.
export const TRANCHE_1_MODULES = [1, 2, 3] as const;

// Modules unlocked on an active monthly/annual subscription (Tracks A-D, modules
// 1-19). Track E (modules 20-25) is sector-specific and added via
// getApplicableTrackEModules() in stripe-subscription-webhook.
export const BASE_SUBSCRIPTION_MODULES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
] as const;

// Modules downgraded to when a subscription lapses or is cancelled. Keeps the
// tranche-1 access the user paid for as a one-time purchase even after
// subscription ends.
export const DOWNGRADE_MODULES = [1, 2, 3] as const;
