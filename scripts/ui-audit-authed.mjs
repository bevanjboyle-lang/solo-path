import { chromium } from "playwright";
const OUT = "/home/claude/ui-audit";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const routes = [["/plan","plan"],["/report","report-authed"],["/library","library"],["/account","account"],["/subscribe","subscribe-authed"],["/radar","radar"],["/pipeline","pipeline"],["/forge","forge"],["/ask-solo","ask-solo"]];
for (const [vpName, vp, mobile] of [["desktop",{width:1440,height:900},false],["mobile",{width:390,height:844},true]]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem("solo_dev_bypass", "1"); } catch {} });
  for (const [route, name] of routes) {
    const page = await ctx.newPage();
    try {
      await page.goto("http://127.0.0.1:4173" + route, { waitUntil: "load", timeout: 20000 });
      await page.waitForTimeout(2500);
      try { await page.getByRole("button", { name: "Got it" }).click({ timeout: 1000 }); } catch {}
      await page.screenshot({ path: `${OUT}/${name}-${vpName}.png`, fullPage: true });
      console.log(`${name}-${vpName}: OK`);
    } catch (e) { console.log(`${name}-${vpName}: FAIL ${e.message.split("\n")[0]}`); }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
