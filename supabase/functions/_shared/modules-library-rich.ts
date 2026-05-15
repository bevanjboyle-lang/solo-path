// _shared/modules-library-rich.ts
// Source: extracted from knowledge-bank/guidance_modules.json v2.0 (25 modules)
// Generated: 2026-05-15 for generate-guidance v26 canonical reconciliation
//
// Canonical source of truth: knowledge-bank/guidance_modules.json. If this drifts
// from the canonical, the .json wins and this file must be regenerated.
//
// Split into three chunk files to keep each file under ~25KB for edit/review tooling.
// Re-exports the merged MODULES_RICH map + the RichModule + RichModuleQuestion types.

import { MODULES_1_9 } from "./modules-1-9.ts";
import { MODULES_10_19 } from "./modules-10-19.ts";
import { MODULES_20_25 } from "./modules-20-25.ts";
import type { RichModule, RichModuleQuestion } from "./modules-rich-types.ts";

export type { RichModule, RichModuleQuestion } from "./modules-rich-types.ts";

export const MODULES_RICH: Record<number, RichModule> = {
  ...MODULES_1_9,
  ...MODULES_10_19,
  ...MODULES_20_25,
};
