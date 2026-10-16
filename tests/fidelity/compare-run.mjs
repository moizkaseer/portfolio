// Phase 4 fidelity: the run report (?freeze=run-report) vs design-reference/run-report-{day,night}.png.
// Compared top → end of Results (the brief §6 sections from MDX sit between Results and "Next run"),
// and the "Next run" block separately, aligned by its top border.
// Usage: node tests/fidelity/compare-run.mjs <baseUrl> <outDir>
import { chromium } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "node:fs";
import path from "node:path";

const [base = "http://localhost:3100", outDir = "docs/fidelity/phase-4"] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const crop = (src, y, h, w = 1440) => {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, 0, y, w, h, 0, 0);
  return out;
};
// reference: "Next run" top border (1px ink line) — measured from the PNG
const REF_NEXT = 2263;
const browser = await chromium.launch();
const rows = [];
for (const theme of ["light", "dark"]) {
  const t = theme === "light" ? "day" : "night";
  const ref = PNG.sync.read(fs.readFileSync(`design-reference/run-report-${t}.png`));
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((x) => { try { localStorage.setItem("mr-theme", x); } catch {} }, theme);
  const page = await ctx.newPage();
  await page.goto(`${base}/work/cold-outreach-agent?freeze=run-report`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const shot = PNG.sync.read(await page.screenshot({ fullPage: true }));
  const nextTop = await page.locator("[data-next-run]").evaluate((e) => Math.round(e.getBoundingClientRect().top + window.scrollY));
  const resultsEnd = await page.locator("#results-h").evaluate((e) => Math.round(e.closest("section").getBoundingClientRect().bottom + window.scrollY));
  const regions = [
    { name: "report", a: 0, b: 0, h: resultsEnd },
    { name: "next-run", a: REF_NEXT, b: nextTop, h: Math.min(ref.height - REF_NEXT, 190) },
  ];
  for (const r of regions) {
    const A = crop(ref, r.a, r.h);
    const B = crop(shot, r.b, r.h);
    // the nav strip is identical by construction but its clock differs; blank it
    if (r.name === "report") for (const img of [A, B]) for (let y = 0; y < 64; y++) for (let x = 0; x < 1440; x++) { const i = (y * 1440 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 0; }
    const diff = new PNG({ width: 1440, height: r.h });
    const n = pixelmatch(A.data, B.data, diff.data, 1440, r.h, { threshold: 0.1 });
    const name = `run-report-${t}-${r.name}`;
    const sbs = new PNG({ width: 2888, height: r.h });
    PNG.bitblt(A, sbs, 0, 0, 1440, r.h, 0, 0);
    PNG.bitblt(B, sbs, 0, 0, 1440, r.h, 1448, 0);
    fs.writeFileSync(path.join(outDir, `${name}.side-by-side.png`), PNG.sync.write(sbs));
    fs.writeFileSync(path.join(outDir, `${name}.diff.png`), PNG.sync.write(diff));
    rows.push({ state: name, mismatch: `${((100 * n) / (r.h * 1440)).toFixed(3)}%` });
  }
  await ctx.close();
}
await browser.close();
console.table(rows);
fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify(rows, null, 2));
