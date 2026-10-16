// Phase 4 screenshots for the owner's review: /work (not in the design), run reports on phones,
// a run report without a trace, and a recording of the title morph (home row → run report).
// Usage: node tests/fidelity/phase4-shots.mjs <baseUrl> <outDir>
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const [base = "http://localhost:3100", outDir = "docs/fidelity/phase-4/screens"] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const shoot = async (url, file, w, h, theme, full = true) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript((t) => localStorage.setItem("mr-theme", t), theme);
  const page = await ctx.newPage();
  await page.goto(base + url, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "[data-askbar]{display:none!important}" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, file), fullPage: full });
  await ctx.close();
};
for (const theme of ["dark", "light"]) {
  const t = theme === "dark" ? "night" : "day";
  await shoot("/work?freeze=1", `work-desktop-${t}.png`, 1440, 900, theme);
  await shoot("/work?freeze=1", `work-phone-${t}.png`, 390, 844, theme);
  await shoot("/work/invoice-extraction-pipeline?freeze=run-report", `run-report-phone-${t}.png`, 390, 844, theme);
}
await shoot("/work/support-inbox-agent?freeze=1", "run-report-no-trace-desktop-day.png", 1440, 900, "light");

// the title morph, recorded (Chromium supports same-document view transitions)
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: path.join(outDir, ".video"), size: { width: 1440, height: 900 } } });
await ctx.addInitScript(() => localStorage.setItem("mr-theme", "dark"));
const page = await ctx.newPage();
await page.goto(base + "/", { waitUntil: "networkidle" });
const row = page.locator('[data-run="lead-research-agent"]');
await row.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await row.hover();
await page.waitForTimeout(900);
await row.click();
await page.waitForURL(/lead-research-agent/);
await page.waitForTimeout(1500);
await page.locator("[data-next-run]").scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.locator("[data-next-run]").click();
await page.waitForURL(/weekly-ops-report/);
await page.waitForTimeout(1500);
const video = page.video();
await ctx.close();
fs.renameSync(await video.path(), path.join(outDir, "title-morph.webm"));
fs.rmSync(path.join(outDir, ".video"), { recursive: true, force: true });
await browser.close();
console.log(fs.readdirSync(outDir).join("\n"));
