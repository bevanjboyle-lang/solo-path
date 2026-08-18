// Phase D verification shots: recency stamp, refreshed evidence, /plan
// heartbeat card, packaging reframe. Serve dist first:
//   node scripts/ui-audit-fonts.mjs
//   npx vite preview --port 4173 --host 127.0.0.1 &
import { chromium } from "playwright";

const OUT = "/home/claude/ui-audit/phase-d";
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

// Recency stamp in the report header
await shot("01-report-updated-stamp-desktop", { viewport: D, path: "/report" });

// Refreshed evidence panel: "refreshed week of" label + NEW chips
await shot("02-report-refreshed-evidence-desktop", { viewport: D, path: "/report", scrollToId: "paths", scrollY: 900 });

// Mobile report header stamp
await shot("03-report-updated-stamp-mobile", { viewport: M, mobile: true, path: "/report" });

// /plan heartbeat card (dev fixture): market note + strand matches
await shot("04-plan-heartbeat-desktop", { viewport: D, path: "/plan" });
await shot("05-plan-heartbeat-mobile", { viewport: M, mobile: true, path: "/plan" });

// Packaging reframe: pricing page cards
await shot("06-pricing-dossier-desktop", { viewport: D, path: "/pricing", scrollY: 500 });

// Packaging reframe: landing pricing block
await shot("07-landing-pricing-desktop", { viewport: D, path: "/", actions: async (p) => {
  await p.evaluate(() => {
    const els = Array.from(document.querySelectorAll("h3"));
    const el = els.find((e) => /independence dossier/i.test(e.textContent || ""));
    el?.scrollIntoView({ block: "center" });
  });
  await p.waitForTimeout(600);
} });

// FAQ cost answer
await shot("08-faq-cost-desktop", { viewport: D, path: "/faq", actions: async (p) => {
  try {
    await p.getByText("What does it cost?").first().click({ timeout: 2000 });
    await p.waitForTimeout(400);
    await p.evaluate(() => {
      const els = Array.from(document.querySelectorAll("*"));
      const el = els.find((e) => e.children.length === 0 && /independence dossier/i.test(e.textContent || ""));
      el?.scrollIntoView({ block: "center" });
    });
    await p.waitForTimeout(300);
  } catch {}
} });

await b.close();
console.log("phase-d shots done");
