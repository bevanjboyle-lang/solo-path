// Sprint 4: fresh full-surface sweep (1440 + 390) + axe-core accessibility
// scan per route. Outputs shots to /home/claude/ui-audit/sprint-4 and a
// JSON of axe violations to /tmp/axe-report.json.
import { chromium } from "playwright";
import fs from "fs";

const OUT = "/home/claude/ui-audit/sprint-4";
fs.mkdirSync(OUT, { recursive: true });
const AXE = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");

const ROUTES = [
  { name: "landing", path: "/" },
  { name: "how-it-works", path: "/how-it-works" },
  { name: "pricing", path: "/pricing" },
  { name: "sample-report", path: "/sample-report" },
  { name: "diagnostic", path: "/diagnostic" },
  { name: "faq", path: "/faq" },
  { name: "signal", path: "/signal" },
  { name: "report", path: "/report" },
  { name: "plan", path: "/plan" },
  { name: "library", path: "/library" },
];

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const axeResults = {};

for (const vp of [{ tag: "d", width: 1440, height: 900 }, { tag: "m", width: 390, height: 844, mobile: true }]) {
  for (const r of ROUTES) {
    const c = await b.newContext({
      viewport: { width: vp.width, height: vp.height },
      ...(vp.mobile ? { isMobile: true, hasTouch: true } : {}),
    });
    await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, (x) => x.abort());
    await c.addInitScript(() => { try { localStorage.setItem("solo_dev_bypass", "1"); } catch {} });
    const p = await c.newPage();
    await p.goto(`http://127.0.0.1:4173${r.path}`, { waitUntil: "load", timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1700);
    try { await p.getByRole("button", { name: "Got it" }).click({ timeout: 500 }); } catch {}
    // full-page shot
    await p.screenshot({ path: `${OUT}/${r.name}-${vp.tag}.png`, fullPage: true });
    // axe on desktop pass only (violations are viewport-stable for our checks)
    if (vp.tag === "d") {
      try {
        await p.evaluate(AXE);
        const res = await p.evaluate(async () => {
          // eslint-disable-next-line no-undef
          const r = await axe.run(document, {
            runOnly: ["wcag2a", "wcag2aa"],
            resultTypes: ["violations"],
          });
          return r.violations.map((v) => ({
            id: v.id, impact: v.impact, help: v.help,
            nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target.join(" "), summary: n.failureSummary?.slice(0, 200) })),
            count: v.nodes.length,
          }));
        });
        axeResults[r.name] = res;
        console.log(`${r.name}: ${res.length} violation types, ${res.reduce((a, v) => a + v.count, 0)} nodes`);
      } catch (e) {
        console.log(`${r.name}: axe failed ${String(e).slice(0, 80)}`);
      }
    }
    await c.close();
  }
}
fs.writeFileSync("/tmp/axe-report.json", JSON.stringify(axeResults, null, 1));
await b.close();
console.log("sweep done");
