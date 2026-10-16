// Screenshots of the sections the design canvas does not show (DESIGN_SPEC §7) for the owner's review.
// Usage: node tests/fidelity/new-sections.mjs <baseUrl> <outDir>
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const [base = "http://localhost:3100", outDir = "docs/fidelity/phase-3/new-sections"] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const [vw, vh, label] of [[1440, 900, "desktop"], [390, 844, "phone"]]) {
  for (const theme of ["dark", "light"]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh } });
    await ctx.addInitScript((t) => localStorage.setItem("mr-theme", t), theme);
    const page = await ctx.newPage();
    const t = theme === "dark" ? "night" : "day";
    if (label === "desktop") {
      for (const step of [0, 2, 4]) {
        await page.goto(`${base}/?freeze=process-${step}`, { waitUntil: "networkidle" });
        await page.locator("[data-askbar]").evaluate((e) => (e.style.display = "none")).catch(() => {});
        const y = await page.locator("[data-process-pin]").evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
        await page.evaluate((y) => window.scrollTo(0, y - 64 - 60), y);
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(outDir, `process-${label}-${t}-step${step + 1}.png`) });
      }
    } else {
      await page.goto(`${base}/?freeze=home-hover`, { waitUntil: "networkidle" });
      await page.locator("[data-askbar]").evaluate((e) => (e.style.display = "none"));
      await page.addStyleTag({ content: "body > header{visibility:hidden}" });
      await page.locator("#process").screenshot({ path: path.join(outDir, `process-${label}-${t}.png`) });
    }
    await page.goto(`${base}/?freeze=home-hover`, { waitUntil: "networkidle" });
    await page.locator("[data-askbar]").evaluate((e) => (e.style.display = "none")).catch(() => {});
    // element screenshots: hide the fixed nav so it doesn't cover the section header
    await page.addStyleTag({ content: "body > header{visibility:hidden}" });
    await page.locator("#toolbox").screenshot({ path: path.join(outDir, `toolbox-${label}-${t}.png`) });
    await page.locator("#contact").screenshot({ path: path.join(outDir, `contact-${label}-${t}.png`) });
    await ctx.close();
  }
}
await browser.close();
console.log(fs.readdirSync(outDir).join("\n"));
