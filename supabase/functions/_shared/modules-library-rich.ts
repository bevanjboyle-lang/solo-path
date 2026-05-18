// _shared/modules-library-rich.ts
// Source: extracted from knowledge-bank/guidance_modules.json v2.0 (modules 1-25)
// + Track F additions (modules 26-32) authored in-place 2026-05-18 for
// coaching layer Phase 5b (admin/coaching-layer-design.md v1.10 §4.4).
// Total: 32 modules across Tracks A-F.
//
// Canonical source of truth for 1-25: knowledge-bank/guidance_modules.json.
// Canonical source of truth for 26-32: this repo (modules-26-32.ts) until
// the JSON is regenerated to include Track F. If 1-25 drifts from the .json
// the .json wins; for 26-32 this file is canonical.
//
// Split into chunk files to keep each file under ~25KB for edit/review tooling.
// Re-exports the merged MODULES_RICH map + the RichModule + RichModuleQuestion types.

import { MODULES_1_9 } from "./modules-1-9.ts";
import { MODULES_10_19 } from "./modules-10-19.ts";
import { MODULES_20_25 } from "./modules-20-25.ts";
import { MODULES_26_32 } from "./modules-26-32.ts";
import type { RichModule, RichModuleQuestion } from "./modules-rich-types.ts";

export type { RichModule, RichModuleQuestion } from "./modules-rich-types.ts";

export const MODULES_RICH: Record<number, RichModule> = {
  ...MODULES_1_9,
  ...MODULES_10_19,
  ...MODULES_20_25,
  ...MODULES_26_32, // Track F — Rejection & Resilience (coaching layer Phase 5b)
};
