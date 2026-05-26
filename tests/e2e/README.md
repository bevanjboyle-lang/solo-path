# Solo end-to-end tests

Playwright tests for the Solo critical funnel. Runs against production
(`https://solo-plan.com`) by default. See
`admin/ways-of-working-review-2026-05-26.md` §W3 for the scope decision.

## What's here

| File | Purpose |
|---|---|
| `critical-funnel.spec.ts` | Pre-auth funnel smoke. Landing → CV upload (skip) → questionnaire → email-capture screen. Stops before email submission. |
| `fixtures/test-cv.pdf` | Synthetic CV. Committed but not currently used by the smoke (Skip path is taken). Available for a future upload-path variant. |

## First-time setup

```bash
# 1. Install dependencies (Bun is the package manager — see bun.lock)
bun install

# 2. Install Playwright's Chromium browser binary (~150 MB, one-time)
bun run e2e:install
```

## Running locally

```bash
# Headless run against production
bun run e2e

# Headed run (watch the browser drive itself)
bun run e2e:headed

# Interactive UI mode (Playwright's debug runner)
bun run e2e:ui
```

## Pointing at a different environment

```bash
# Local dev server (assumes bun run dev on default port)
PLAYWRIGHT_BASE_URL=http://localhost:5173 bun run e2e

# A Vercel preview deploy
PLAYWRIGHT_BASE_URL=https://solo-path-git-feature-x.vercel.app bun run e2e
```

## What this test deliberately does NOT do

The smoke stops at the email-capture screen. It never clicks the final
"Continue" that submits an email address. This is on purpose:

- Submitting an email creates a new anonymous user row in Supabase.
- It also sends a real magic-link email via Resend.
- And it triggers `generate-report` which calls OpenAI.

Post-auth coverage was scaffolded once and reverted on 2026-05-26 as out of
scope for the current W3 iteration. Until that decision is revisited, the
pre-auth smoke covers the largest read-only portion of the funnel with zero
side effects on production data or vendor spend.

## CI

Not wired yet. Lands when W1 (GitHub Actions for edge function deploys) is
in place. The Playwright job will be a sibling workflow:

```yaml
# .github/workflows/e2e.yml (future)
- run: bun install
- run: bun run e2e:install
- run: bun run e2e
  env:
    PLAYWRIGHT_BASE_URL: https://solo-plan.com  # or preview URL
```

## Debugging a failure

When a test fails:

- `playwright-report/index.html` opens an interactive trace viewer.
- `test-results/` holds screenshots, videos, and per-trace recordings for any
  failed test (video is retained only on failure; screenshot is taken on
  failure only).
- Use `bun run e2e:headed` to watch the failure happen in a visible browser.
- Use `bun run e2e:ui` for the time-travel debugger.

## Vitest

Unit tests live separately under `src/test/`. Run with `bun test` or
`bun run test:watch`. The pattern is mock-Supabase + render the component.
See `src/test/questionnaire.test.tsx` for the established pattern.
