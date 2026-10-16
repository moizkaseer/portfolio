// Phase 3 fidelity: the home sections that exist in the design (manifesto, selected runs with the
// highlighted row + ghost pointer, agent section, footer) vs design-reference/home-{day,night}.png.
// The reference still has the old graph hero, so each section is aligned by its header hairline.
// Usage: node tests/fidelity/compare-home.mjs <baseUrl> <outDir>
import { chromium } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "node:fs";
import path from "node:path";

const [base = "http://localhost:3100", outDir = "docs/fidelity/phase-3"] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

// hairline y positions in the 1440-wide reference (measured from the PNGs)
const REF = { manifesto: 1113, runs: 1540, agent: 2452, footer: 3091, end: 3651 };
const SECTIONS = [
  { name: "manifesto", from: REF.manifesto - 30, to: REF.runs - 30, anchor: "#manifesto [data-rail-tick]", offset: -30 },
  { name: "selected-runs", from: REF.runs - 30, to: REF.agent - 140 - 30, anchor: "#work [data-rail-tick]", offset: -30 },
  { name: "agent", from: REF.agent - 30, to: REF.footer - 120, anchor: "#agent [data-rail-tick]", offset: -30 },
  { name: "footer", from: REF.footer - 1, to: REF.end, anchor: "footer", offset: -1 + 24, top: true },
];

const crop = (src, y, h, w = 1440) => {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, 0, y, w, h, 0, 0);
  return out;
};

const browser = await chromium.launch();
const rows = [];
for (const theme of ["light", "dark"]) {
  const ref = PNG.sync.read(fs.readFileSync(`design-reference/home-${theme === "light" ? "day" : "night"}.png`));
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((t) => { try { localStorage.setItem("mr-theme", t); } catch {} }, theme);
  const page = await ctx.newPage();
  await page.goto(`${base}/?freeze=home-hover`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const shot = PNG.sync.read(await page.screenshot({ fullPage: true }));
  for (const s of SECTIONS) {
    const y = await page.evaluate(({ sel, top }) => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return Math.round((top ? r.top : r.bottom) + window.scrollY);
    }, { sel: s.anchor, top: !!s.top });
    const myY = s.top ? y + s.offset - 24 : y + s.offset;
    const h = Math.min(s.to - s.from, shot.height - myY);
    const a = crop(ref, s.from, h);
    const b = crop(shot, myY, h);
    const diff = new PNG({ width: 1440, height: h });
    const n = pixelmatch(a.data, b.data, diff.data, 1440, h, { threshold: 0.1 });
    const name = `home-${theme === "light" ? "day" : "night"}-${s.name}`;
    const sbs = new PNG({ width: 1440 * 2 + 8, height: h });
    PNG.bitblt(a, sbs, 0, 0, 1440, h, 0, 0);
    PNG.bitblt(b, sbs, 0, 0, 1440, h, 1448, 0);
    fs.writeFileSync(path.join(outDir, `${name}.side-by-side.png`), PNG.sync.write(sbs));
    fs.writeFileSync(path.join(outDir, `${name}.diff.png`), PNG.sync.write(diff));
    rows.push({ state: name, mismatch: `${((100 * n) / (h * 1440)).toFixed(3)}%` });
  }
  await ctx.close();
}
await browser.close();
console.table(rows);
fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify(rows, null, 2));
