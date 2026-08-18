// UI audit screenshot harness — desktop 1440x900 + mobile 390x844, full-page.
import { chromium } from "playwright";
import fs from "fs";

const OUT = "/home/claude/ui-audit";
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://127.0.0.1:4173";

const ROUTES = [
  ["/", "landing", true],
  ["/diagnostic", "diagnostic", true],
  ["/sample-report", "sample-report", true],
  ["/how-it-works", "how-it-works", true],
  ["/pricing", "pricing", true],
  ["/subscribe", "subscribe", true],
  ["/signal", "signal", true],
  ["/faq", "faq", true],
  ["/questionnaire", "questionnaire", true],
  ["/cv-upload", "cv-upload", true],
  ["/teaser", "teaser", true],
  ["/auth", "auth", true],
  ["/privacy", "privacy", true],
  ["/processing", "processing", true],
  ["/500", "servererror", true],
  ["/404-nonexistent", "notfound", true],
];

const VIEWPORTS = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
];

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const results = [];
for (const [vpName, viewport] of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: vpName === "mobile",
    hasTouch: vpName === "mobile",
    userAgent:
      vpName === "mobile"
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        : undefined,
  });
  // Kill external requests fast so empty states render deterministically.
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  for (const [route, name, fullPage] of ROUTES) {
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + route, { waitUntil: "load", timeout: 20000 });
      // Let network settle or time out — supabase is firewalled so requests hang/fail.
      await page
        .waitForLoadState("networkidle", { timeout: 6000 })
        .catch(() => {});
      await page.waitForTimeout(1200);
      const file = `${OUT}/${name}-${vpName}.png`;
      await page.screenshot({ path: file, fullPage });
      const h = await page.evaluate(() => document.body.scrollHeight);
      results.push(`${name}-${vpName}: OK (pageHeight=${h})`);
    } catch (e) {
      results.push(`${name}-${vpName}: FAILED — ${e.message.split("\n")[0]}`);
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(results.join("\n"));
