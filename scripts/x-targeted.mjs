import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const shots = [];
// 1. mobile landing top (viewport only)
{ const c = await b.newContext({ viewport: {width:390,height:844}, isMobile:true, hasTouch:true });
  await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const p = await c.newPage();
  await p.goto("http://127.0.0.1:4173/", { waitUntil: "load", timeout: 20000 }).catch(()=>{});
  await p.waitForTimeout(1500);
  try { await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }); } catch {}
  await p.screenshot({ path: "/home/claude/ui-audit/x-landing-mobile-top.png" });
  // scrolled: sticky nav check on mobile
  await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(400);
  await p.screenshot({ path: "/home/claude/ui-audit/x-landing-mobile-pinned.png" });
  await c.close(); }
// 2. diagnostic mobile bottom (footer check)
{ const c = await b.newContext({ viewport: {width:390,height:844}, isMobile:true, hasTouch:true });
  await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const p = await c.newPage();
  await p.goto("http://127.0.0.1:4173/diagnostic", { waitUntil: "load", timeout: 20000 }).catch(()=>{});
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(400);
  await p.screenshot({ path: "/home/claude/ui-audit/x-diagnostic-mobile-bottom.png" });
  await c.close(); }
// 3. forge failure state (14s wait) desktop
{ const c = await b.newContext({ viewport: {width:1440,height:900} });
  await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await c.addInitScript(() => { try { localStorage.setItem("solo_dev_bypass", "1"); } catch {} });
  const p = await c.newPage();
  await p.goto("http://127.0.0.1:4173/forge", { waitUntil: "load", timeout: 20000 }).catch(()=>{});
  await p.waitForTimeout(14000);
  await p.screenshot({ path: "/home/claude/ui-audit/x-forge-failure-desktop.png" });
  await c.close(); }
// 4. teaser dev-bypass desktop (new redacted LockedArea)
{ const c = await b.newContext({ viewport: {width:1440,height:900} });
  await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await c.addInitScript(() => { try { localStorage.setItem("solo_dev_bypass", "1"); } catch {} });
  const p = await c.newPage();
  await p.goto("http://127.0.0.1:4173/teaser", { waitUntil: "load", timeout: 20000 }).catch(()=>{});
  await p.waitForTimeout(2500);
  const el = await p.$("text=Behind the gate");
  if (el) await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  await p.screenshot({ path: "/home/claude/ui-audit/x-teaser-locked-desktop.png" });
  await c.close(); }
await b.close();
console.log("targeted done");
