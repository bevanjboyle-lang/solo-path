/**
 * Pre-auth funnel smoke test.
 *
 * Covers: Landing → CV upload (skip) → Questionnaire (Q1 through last) →
 * email-capture screen. Stops before email submission so the test does not
 * create a user, send a magic-link email, or trigger generate-report.
 *
 * Runs against production by default (https://solo-plan.com). Override with
 * PLAYWRIGHT_BASE_URL for preview deploys or local dev.
 *
 * Scope decision: admin/ways-of-working-review-2026-05-26.md §W3.
 *
 * The synthetic CV at fixtures/test-cv.pdf is committed but unused for this
 * smoke (we take the Skip path to avoid hitting the parse-cv edge function on
 * every run). A future variant test can switch to the upload path when we
 * want to exercise CV parsing too.
 */
import { test, expect, Page } from "@playwright/test";

const QUESTION_SAFETY_LIMIT = 25; // questions.ts has ~16; allow headroom for branching

test.describe("Pre-auth funnel", () => {
  test("CV-upload skip path reaches email capture", async ({ page }) => {
    // 1. Landing loads
    await page.goto("/");
    await expect(page).toHaveTitle(/Solo/i);

    // 2. Enter the funnel at the CV upload step
    await page.goto("/cv-upload");

    // 3. Skip the CV upload (always-available action per CVUpload.tsx)
    await page
      .getByRole("button", { name: /Skip this step/i })
      .click();

    // 4. Land on the questionnaire and wait for it to settle
    await page.waitForURL("**/questionnaire", { timeout: 15_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 });

    // 5. Walk the questions. Loop bounded by a safety counter; exit when the
    //    email-capture input appears.
    for (let step = 0; step < QUESTION_SAFETY_LIMIT; step++) {
      if (await isOnEmailStep(page)) break;

      // Wait for the question heading to be visible before answering. This
      // prevents the answerer from racing the React hydration / question
      // transition animation.
      await page.waitForSelector("h2", { state: "visible", timeout: 10_000 });

      await answerCurrentQuestion(page);
      await clickContinue(page);
      // Brief settle between transitions — the questionnaire animates.
      await page.waitForTimeout(300);
    }

    // 6. Assert we have reached the email-capture step
    const emailInput = page.locator('#email[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    // 7. Sanity: the first-name field is also present
    const firstNameInput = page.locator('#first-name');
    await expect(firstNameInput).toBeVisible();

    // 8. Sanity: a "Continue" CTA still exists (the submit-the-email button).
    //    We do NOT click it — the test stops here to avoid creating a user,
    //    sending a magic link, or triggering generate-report.
    await expect(
      page.getByRole("button", { name: /Continue/i })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function isOnEmailStep(page: Page): Promise<boolean> {
  return await page
    .locator('#email[type="email"]')
    .isVisible()
    .catch(() => false);
}

/**
 * Answer whatever question is currently visible. Strategy:
 *   1. Native <select> dropdown → selectOption() skipping the empty placeholder
 *   2. Textarea → fill with placeholder text (covers all "text" question type)
 *   3. RadioStack option button → click the first non-chrome button
 *
 * Solo's Questionnaire renders three input shapes (per Questionnaire.tsx and
 * questions.ts): text → <textarea>, single → RadioStack <button> options,
 * dropdown → native <select> with an empty leading placeholder option.
 * There are no multi questions in the current questionnaire.
 */
async function answerCurrentQuestion(page: Page): Promise<void> {
  // 1. Native <select> (Q3 sector). First <option> is an empty placeholder
  //    that does NOT satisfy the required check, so explicitly pick the
  //    first non-empty value via selectOption().
  const select = page.locator("select").first();
  if (await select.isVisible().catch(() => false)) {
    const optionValues = await select
      .locator("option")
      .evaluateAll((opts) =>
        (opts as HTMLOptionElement[]).map((o) => o.value).filter((v) => v !== "")
      );
    if (optionValues.length > 0) {
      await select.selectOption(optionValues[0]);
      return;
    }
  }

  // 2. Textarea (all "text" questions: Q1, Q6, Q7, Q8, Q11, Q12, Q15, Q30)
  const textarea = page.locator("textarea").first();
  if (await textarea.isVisible().catch(() => false)) {
    const answerText = "Test answer for the pre-auth smoke test.";
    // Click first to ensure focus, then type character-by-character so React's
    // controlled component picks up every input event. .fill() collapses the
    // events into a single change which can race with the questionnaire's
    // hydration on slow renders.
    await textarea.click();
    await textarea.pressSequentially(answerText, { delay: 5 });
    // Verify the value actually took. If this throws, the controlled-component
    // wiring is the culprit and we'll know exactly where to look.
    const actual = await textarea.inputValue();
    if (!actual || actual.trim().length === 0) {
      throw new Error(
        `Textarea fill did not propagate to value. Expected non-empty, got: "${actual}"`
      );
    }
    return;
  }

  // 3. RadioStack option (single-choice questions: Q2, Q4, Q5, Q9, Q10, Q13, Q14)
  //    Each option renders as <button type="button"> inside a flex-col stack.
  //    Filter out chrome buttons (Continue, Back, TopBar nav) by visible text.
  const chromeButtonNames = /^(Continue|Back|Skip|Sign in|Sign out|Go back|Add my email|Solo|Plan|Report|Library|Account)/i;
  const optionButton = page
    .locator("button:visible")
    .filter({ hasNotText: chromeButtonNames })
    .first();
  await optionButton.click();
}

async function clickContinue(page: Page): Promise<void> {
  // Wait for Continue to become enabled. If it stays disabled, that's a
  // signal that the previous answer didn't register — surface that as a
  // clear failure rather than a 15-second "element not enabled" timeout.
  const continueButton = page.getByRole("button", { name: /^Continue$/i });
  await expect(continueButton).toBeEnabled({ timeout: 10_000 });
  await continueButton.click();
}
