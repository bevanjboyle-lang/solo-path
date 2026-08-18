// Screenshot-harness helper: inject local Fontsource faces into dist/ so
// audit screenshots render the real typography while Google Fonts is
// unreachable from the sandbox. Never part of the shipped app.
import fs from "fs";
import path from "path";

const DIST = "dist";
const FONTS = path.join(DIST, "audit-fonts");
fs.mkdirSync(FONTS, { recursive: true });

const faces = [];
const want = [
  ["inter", "Inter", [[400, "normal"], [500, "normal"], [600, "normal"], [700, "normal"]]],
  ["plus-jakarta-sans", "Plus Jakarta Sans", [[600, "normal"], [700, "normal"], [800, "normal"]]],
  ["source-serif-4", "Source Serif 4", [[400, "normal"], [600, "normal"]]],
];
for (const [pkg, family, weights] of want) {
  const dir = path.join("node_modules", "@fontsource", pkg, "files");
  if (!fs.existsSync(dir)) continue;
  for (const [w] of weights) {
    const candidates = fs.readdirSync(dir).filter((f) => f.includes(`latin-${w}-normal`) && f.endsWith(".woff2") && !f.includes("italic"));
    const file = candidates.find((f) => f.startsWith(`${pkg}-latin-${w}-normal`)) ?? candidates[0];
    if (!file) continue;
    fs.copyFileSync(path.join(dir, file), path.join(FONTS, file));
    faces.push(`@font-face{font-family:'${family}';font-style:normal;font-weight:${w};src:url('/audit-fonts/${file}') format('woff2');font-display:swap;}`);
  }
}
const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
if (!html.includes("audit-fonts-style")) {
  fs.writeFileSync(
    path.join(DIST, "index.html"),
    html.replace("</head>", `<style id="audit-fonts-style">${faces.join("")}</style></head>`),
  );
}
console.log(`patched dist with ${faces.length} faces`);
