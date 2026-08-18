// Sprint 2 verification shots: tiered report, evidence cards, wayfinder,
// button family. Serve dist first:
//   node scripts/ui-audit-fonts.mjs
//   npx vite preview --port 4173 --host 127.0.0.1 &
import { chromium } from "playwright";

const OUT = "/home/claude/ui-audit/sprint-2";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });

async function shot(name, { viewport, mobile, path, scrollToId, scrollY, actions }) {
  const c = await b.newContext({ viewport, ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
  await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await c.addInitScript(() => {
    try { localStorage.setItem("solo_dev_bypass", "1"); } catch {}
  });
  const p = await c.newPage();
  await p.goto(`http://127.0.0.1:4173${path}`, { waitUntil: "load", timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1800);
  try { await p.getByRole("button", { name: "Got it" }).click({ timeout: 700 }); } catch {}
  if (scrollToId) {
    await p.evaluate((id) => document.getElementById(id)?.scrollIntoView({ block: "start" }), scrollToId);
    await p.waitForTimeout(600);
  }
  if (typeof scrollY === "number") {
    await p.evaluate((y) => window.scrollBy(0, y), scrollY);
    await p.waitForTimeout(500);
  }
  if (actions) await actions(p);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  await c.close();
  console.log("shot:", name);
}

const D = { width: 1440, height: 900 };
const M = { width: 390, height: 844 };

// Tiered options: front runners band with evidence
await shot("01-report-paths-front-desktop", { viewport: D, path: "/report", scrollToId: "paths" });
await shot("02-report-paths-evidence-desktop", { viewport: D, path: "/report", scrollToId: "paths", scrollY: 900 });
await shot("03-report-paths-credible-desktop", { viewport: D, path: "/report", scrollToId: "paths", scrollY: 2600 });
await shot("04-report-paths-stretch-desktop", { viewport: D, path: "/report", scrollToId: "paths", scrollY: 4400 });

// Mobile: wayfinder collapsed over the paths section
await shot("05-report-mobile-wayfinder", { viewport: M, mobile: true, path: "/report", scrollToId: "paths" });
// Mobile: wayfinder open
await shot("06-report-mobile-wayfinder-open", {
  viewport: M,
  mobile: true,
  path: "/report",
  scrollToId: "paths",
  actions: async (p) => {
    try {
      await p.locator(".wayfinder > button").click({ timeout: 2000 });
      await p.waitForTimeout(400);
    } catch {}
  },
});
// Mobile evidence card
await shot("07-report-mobile-evidence", { viewport: M, mobile: true, path: "/report", scrollToId: "paths", scrollY: 1200 });

// Recommendation chip + report-h2 canon
await shot("08-report-recommendation-desktop", { viewport: D, path: "/report", scrollToId: "recommendation" });

// Button family: diagnostic disabled state (fresh visitor, CV stage has no disabled;
// typed path first question empty -> disabled Continue)
await shot("09-diagnostic-disabled-button", {
  viewport: D,
  path: "/diagnostic",
  actions: async (p) => {
    try {
      await p.getByRole("button", { name: /Five short questions instead/ }).click({ timeout: 2500 });
      await p.waitForTimeout(500);
    } catch {}
  },
});

// Sample report locked variant sanity (unchanged for prospects)
await shot("10-sample-report-desktop", { viewport: D, path: "/sample-report", scrollY: 1400 });

await b.close();
console.log("sprint-2 shots done");
