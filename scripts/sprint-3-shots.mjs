// Sprint 3 verification shots: motion end-states, editorial loading, dark
// band, landing composition, sample-report wayfinder, ticker low-data.
// Serve dist first:
//   node scripts/ui-audit-fonts.mjs
//   npx vite preview --port 4173 --host 127.0.0.1 &
import { chromium } from "playwright";

const OUT = "/home/claude/ui-audit/sprint-3";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });

async function shot(name, { viewport, mobile, path, scrollToId, scrollY, actions, settle = 1800 }) {
  const c = await b.newContext({ viewport, ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
  await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await c.addInitScript(() => {
    try { localStorage.setItem("solo_dev_bypass", "1"); } catch {}
  });
  const p = await c.newPage();
  await p.goto(`http://127.0.0.1:4173${path}`, { waitUntil: "load", timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(settle);
  try { await p.getByRole("button", { name: "Got it" }).click({ timeout: 700 }); } catch {}
  if (scrollToId) {
    await p.evaluate((id) => document.getElementById(id)?.scrollIntoView({ block: "start" }), scrollToId);
    await p.waitForTimeout(900);
  }
  if (typeof scrollY === "number") {
    await p.evaluate((y) => window.scrollBy(0, y), scrollY);
    await p.waitForTimeout(900);
  }
  if (actions) await actions(p);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  await c.close();
  console.log("shot:", name);
}

const D = { width: 1440, height: 900 };
const M = { width: 390, height: 844 };

// 1. Dark band reconciled (report AI section, desktop + mobile)
await shot("01-report-ai-dark-desktop", { viewport: D, path: "/report", scrollToId: "ai" });
await shot("02-report-ai-dark-mobile", { viewport: M, mobile: true, path: "/report", scrollToId: "ai" });

// 2. Rank-1 entrance end-state + revealed sections (content must be fully
//    visible after settle; catches any Reveal stuck at opacity 0)
await shot("03-report-paths-revealed", { viewport: D, path: "/report", scrollToId: "paths" });

// 3. Editorial loading state: intercept the report page pre-data by viewing
//    /plan without bypass? Simplest: shoot the component on /pipeline where
//    loading shows while fetch fails offline.
await shot("04-editorial-loading-pipeline", { viewport: D, path: "/pipeline", settle: 700 });

// 4. Landing: recomposed Why Solo grid (no hole), desktop
await shot("05-landing-why-solo-grid", {
  viewport: D,
  path: "/",
  actions: async (p) => {
    await p.evaluate(() => {
      const els = Array.from(document.querySelectorAll("h4"));
      const el = els.find((e) => /Why Solo/i.test(e.textContent || ""));
      el?.scrollIntoView({ block: "start" });
      window.scrollBy(0, -60);
    });
    await p.waitForTimeout(900);
  },
});

// 5. Ticker low-data static state (offline => feed empty => static strip)
await shot("06-ticker-low-data", { viewport: D, path: "/", settle: 2500 });

// 6. Sample report mobile wayfinder, closed + open
await shot("07-sample-mobile-wayfinder", { viewport: M, mobile: true, path: "/sample-report", scrollToId: "paths" });
await shot("08-sample-mobile-wayfinder-open", {
  viewport: M,
  mobile: true,
  path: "/sample-report",
  scrollToId: "paths",
  actions: async (p) => {
    try {
      await p.locator(".wayfinder > button").click({ timeout: 2000 });
      await p.waitForTimeout(400);
    } catch {}
  },
});

// 7. Sticky nav stuck-state shadow (desktop landing scrolled)
await shot("09-sticky-nav-stuck", { viewport: D, path: "/", scrollY: 700 });

// 8. Sample report AI dark band (public shop window)
await shot("10-sample-ai-dark-desktop", { viewport: D, path: "/sample-report", scrollToId: "ai" });

await b.close();
console.log("sprint-3 shots done");
