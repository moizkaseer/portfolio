// Records the full 73.7s cycle (four example loops) of the hero + prompt, desktop and phone.
// Usage: node tests/fidelity/record.mjs <baseUrl> <outDir>
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const [base = "http://localhost:3100", outDir = "docs/fidelity/phase-2"] = process.argv.slice(2);
const CYCLE_MS = 73686;
const browser = await chromium.launch();
await Promise.all(
  [
    { name: "hero-loop-desktop", w: 1440, h: 1840 },
    { name: "hero-loop-phone", w: 390, h: 1970 },
  ].map(async (c) => {
    const dir = path.join(outDir, `.${c.name}`);
    const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, recordVideo: { dir, size: { width: c.w, height: c.h } } });
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(CYCLE_MS + 1500);
    const video = page.video();
    await ctx.close();
    fs.renameSync(await video.path(), path.join(outDir, `${c.name}.webm`));
    fs.rmSync(dir, { recursive: true, force: true });
  }),
);
await browser.close();
console.log("recorded");
