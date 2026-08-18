import { chromium } from "playwright";
const OUT = "/home/claude/ui-audit";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });

async function shot(vp, route, scrollY, name, mobile=false) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:4173" + route, { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(1500);
  // dismiss cookie banner
  try { await page.getByRole("button", { name: "Got it" }).click({ timeout: 2000 }); } catch {}
  await page.evaluate(y => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
  console.log(name, "done");
}

await shot({width:1440,height:900}, "/", 1400, "landing-desktop-scrolled");
await shot({width:1440,height:900}, "/sample-report", 6000, "sample-report-desktop-scrolled");
await shot({width:1440,height:900}, "/diagnostic", 400, "diagnostic-desktop-scrolled");
await shot({width:390,height:844}, "/", 300, "landing-mobile-scrolled", true);
await shot({width:390,height:844}, "/sample-report", 6000, "sample-report-mobile-scrolled", true);
await shot({width:1440,height:900}, "/signal/some-edition", 0, "signal-edition-desktop");
await browser.close();
