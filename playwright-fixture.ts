/**
 * Pass-through re-export.
 *
 * The original Lovable preset (lovable-agent-playwright-config/fixture) was
 * never installed and is no longer available post-ADR-021. New tests should
 * import directly from "@playwright/test" instead of using this file.
 *
 * This re-export is kept for backward compatibility only and can be deleted
 * once nothing imports from it.
 */
export { test, expect } from "@playwright/test";
