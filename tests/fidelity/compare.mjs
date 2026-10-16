// Fidelity check (DESIGN_SPEC §9): screenshot freeze states, diff against design-reference.
// Usage: node tests/fidelity/compare.mjs <baseUrl> <outDir>
import { chromium } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "node:fs";
import path from "node:path";

const [base = "http://localhost:3100", outDir = "fidelity-report"] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

// The nav strip is excluded: the full Main.html nav wins over the hero screen's short nav (owner decision, AUDIT §8).
const CASES = [
  { name: "desktop-night-start", ref: "hero-night-start.png", freeze: "t400", w: 1440, h: 1840, theme: "dark", navH: 64 },
  { name: "desktop-day-start", ref: "hero-day-start.png", freeze: "t400", w: 1440, h: 1840, theme: "light", navH: 64 },
  { name: "desktop-night-prompt-done", ref: "hero-night-prompt-done.png", freeze: "t17000", w: 1440, h: 1840, theme: "dark", navH: 64 },
  { name: "desktop-day-prompt-done", ref: "hero-day-prompt-done.png", freeze: "t17000", w: 1440, h: 1840, theme: "light", navH: 64 },
  { name: "phone-night-start", ref: "hero-phone-night-start.png", freeze: "t400", w: 390, h: 1970, theme: "dark", navH: 56 },
  { name: "phone-day-start", ref: "hero-phone-day-start.png", freeze: "t400", w: 390, h: 1970, theme: "light", navH: 56 },
  { name: "phone-night-prompt-done", ref: "hero-phone-night-prompt-done.png", freeze: "t17000", w: 390, h: 1970, theme: "dark", navH: 56 },
  { name: "phone-day-prompt-done", ref: "hero-phone-day-prompt-done.png", freeze: "t17000", w: 390, h: 1970, theme: "light", navH: 56 },
];

const browser = await chromium.launch();
const rows = [];
for (const c of CASES) {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: 1 });
  await ctx.addInitScript((t) => { try { localStorage.setItem("mr-theme", t); } catch {} }, c.theme);
  const page = await ctx.newPage();
  await page.goto(`${base}/?freeze=${c.freeze}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const shotPath = path.join(outDir, `${c.name}.png`);
  await page.screenshot({ path: shotPath, clip: { x: 0, y: 0, width: c.w, height: c.h } });
  await ctx.close();

  const ref = PNG.sync.read(fs.readFileSync(path.join("design-reference", c.ref)));
  const got = PNG.sync.read(fs.readFileSync(shotPath));
  // blank the nav strip in both images
  for (const img of [ref, got]) for (let y = 0; y < c.navH; y++) for (let x = 0; x < c.w; x++) {
    const i = (y * c.w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 0; img.data[i + 3] = 255;
  }
  const diff = new PNG({ width: c.w, height: c.h });
  const n = pixelmatch(ref.data, got.data, diff.data, c.w, c.h, { threshold: 0.1 });
  fs.writeFileSync(path.join(outDir, `${c.name}.diff.png`), PNG.sync.write(diff));
  // side by side: reference | build
  const sbs = new PNG({ width: c.w * 2 + 8, height: c.h });
  PNG.bitblt(ref, sbs, 0, 0, c.w, c.h, 0, 0);
  PNG.bitblt(got, sbs, 0, 0, c.w, c.h, c.w + 8, 0);
  fs.writeFileSync(path.join(outDir, `${c.name}.side-by-side.png`), PNG.sync.write(sbs));
  const pct = (100 * n) / ((c.h - c.navH) * c.w);
  rows.push({ state: c.name, mismatch: `${pct.toFixed(3)}%` });
}
await browser.close();
console.table(rows);
fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify(rows, null, 2));
