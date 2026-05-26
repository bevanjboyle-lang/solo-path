import { defineConfig, devices } from "@playwright/test";

/**
 * Self-contained Playwright config for Solo.
 *
 * Targets production (https://solo-plan.com) by default. Override with
 * PLAYWRIGHT_BASE_URL for preview deploys or local dev once W7 lands.
 *
 * Scope decision in admin/ways-of-working-review-2026-05-26.md §W3.
 * Replaces an earlier config that imported lovable-agent-playwright-config,
 * which was never installed and was vestigial post-ADR-021.
 */

const isCI = !!process.env.CI;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://solo-plan.com";

export default defineConfig({
  testDir: "./tests/e2e",
  // Single-worker, sequential. We're hitting production; do not parallelise.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["html"], ["github"]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
