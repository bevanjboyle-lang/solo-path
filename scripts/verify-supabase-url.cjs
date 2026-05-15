#!/usr/bin/env node
/**
 * Build-time check: fail the build if VITE_SUPABASE_URL doesn't point at
 * the correct production Supabase project.
 *
 * Background: Lovable's bot has a history of committing the wrong project
 * ID into .env (a Lovable demo Supabase rather than Bevan's real one). The
 * symptom was every report generation silently failing for ~7 days in May
 * 2026 before being root-caused. This script runs as a `prebuild` step so
 * any Vercel build picks up the misconfiguration BEFORE shipping a broken
 * bundle to production.
 *
 * To override (e.g. if the project ID legitimately changes), edit the
 * EXPECTED_PROJECT_ID constant below.
 */

const EXPECTED_PROJECT_ID = "dnnxmjazillhktwttkux";
const EXPECTED_URL_SUBSTRING = `https://${EXPECTED_PROJECT_ID}.supabase.co`;

const url = process.env.VITE_SUPABASE_URL || "";
const projectId = process.env.VITE_SUPABASE_PROJECT_ID || "";

const errors = [];

if (!url) {
  errors.push("VITE_SUPABASE_URL is not set");
} else if (!url.includes(EXPECTED_PROJECT_ID)) {
  errors.push(
    `VITE_SUPABASE_URL is "${url}" but should contain "${EXPECTED_PROJECT_ID}" ` +
      `(expected something like "${EXPECTED_URL_SUBSTRING}")`,
  );
}

if (projectId && projectId !== EXPECTED_PROJECT_ID) {
  errors.push(
    `VITE_SUPABASE_PROJECT_ID is "${projectId}" but should be "${EXPECTED_PROJECT_ID}"`,
  );
}

if (errors.length > 0) {
  console.error("");
  console.error("=".repeat(72));
  console.error("BUILD HALTED: Supabase project misconfiguration detected");
  console.error("=".repeat(72));
  errors.forEach((e) => console.error("  - " + e));
  console.error("");
  console.error("Fix:");
  console.error("  1. Set VITE_SUPABASE_URL and VITE_SUPABASE_PROJECT_ID in");
  console.error(
    "     Vercel project env vars (https://vercel.com/.../settings/environment-variables)",
  );
  console.error(`  2. The correct project ID is: ${EXPECTED_PROJECT_ID}`);
  console.error(
    "  3. If using a local .env file, ensure it has the correct values",
  );
  console.error("");
  console.error(
    "Background: Lovable's bot has a history of committing wrong project IDs",
  );
  console.error(
    "into .env. This script catches that before a broken bundle ships to prod.",
  );
  console.error("=".repeat(72));
  console.error("");
  process.exit(1);
}

console.log(
  `[verify-supabase-url] OK - VITE_SUPABASE_URL points at ${EXPECTED_PROJECT_ID}`,
);
