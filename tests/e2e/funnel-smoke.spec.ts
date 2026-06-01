import { test, expect } from "@playwright/test";

// Pre-auth funnel smoke (W3).
// Covers the anonymous critical path that today's frontend changes touched:
//   landing -> CV upload (privacy microcopy) -> questionnaire (Q1 renders).
// Deliberately stops BEFORE submitting anything, so it never creates rows or
// sends a magic link. Pure render + no-console-error verification.
//
// BASE_URL defaults to production; point it at a Vercel preview in CI by
// setting the PLAYWRIGHT_BASE_URL env var.

const collectConsoleErrors = (page: import("@playwright/test").Page) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
};

test.describe("anonymous funnel smoke", () => {
  test("landing renders and offers the start CTA", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/");
    await expect(page).toHaveTitle(/Solo/i);
    // The primary start CTA somewhere on the page.
    await expect(
      page.getByRole("link", { name: /find what fits|get (my|started)|start/i }).first(),
    ).toBeVisible();
    expect(errors, `console errors on /: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("CV upload renders with privacy microcopy and is skippable", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/cv-upload");
    // Trust microcopy shipped 2026-06-01 — guard against regression.
    await expect(page.getByText(/never store it after that/i)).toBeVisible();
    await expect(page.getByText(/skip this step/i)).toBeVisible();
    expect(errors, `console errors on /cv-upload: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("questionnaire renders Q1 without errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/questionnaire");
    await expect(page.getByText(/step 1 of/i)).toBeVisible();
    await expect(page.getByText(/current or most recent job title/i)).toBeVisible();
    expect(errors, `console errors on /questionnaire: ${errors.join(" | ")}`).toHaveLength(0);
  });
});
