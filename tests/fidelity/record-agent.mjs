// Records the agent (demo replay) opening a project: desktop from section 06, phone from the
// "Ask the agent" bar. Usage: node tests/fidelity/record-agent.mjs <baseUrl> <outDir>
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const [base = "http://localhost:3100", outDir = "docs/fidelity/phase-5"] = process.argv.slice(2);
const browser = await chromium.launch();
for (const c of [
  { name: "agent-opens-project-desktop", vp: { width: 1440, height: 900 }, phone: false },
  { name: "agent-opens-project-phone", vp: { width: 390, height: 844 }, phone: true },
]) {
  const dir = path.join(outDir, `.${c.name}`);
  const ctx = await browser.newContext({ viewport: c.vp, hasTouch: c.phone, isMobile: c.phone, recordVideo: { dir, size: c.vp } });
  await ctx.addInitScript(() => localStorage.setItem("mr-theme", "dark"));
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  if (c.phone) {
    await page.locator("[data-askbar]").click();
    await page.waitForTimeout(900);
    await page.locator("[data-agent-panel-el]").getByRole("button", { name: "Show me your best project" }).click();
  } else {
    await page.locator("#agent").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await page.mouse.move(200, 200);
    await page.locator("#agent").getByRole("button", { name: "Show me your best project" }).click();
  }
  await page.waitForURL(/invoice-extraction-pipeline/, { timeout: 30000 });
  await page.waitForTimeout(3000);
  const video = page.video();
  await ctx.close();
  fs.renameSync(await video.path(), path.join(outDir, `${c.name}.webm`));
  fs.rmSync(dir, { recursive: true, force: true });
}
await browser.close();
console.log(fs.readdirSync(outDir).map((f) => `${f} ${(fs.statSync(path.join(outDir, f)).size / 1e6).toFixed(1)}MB`).join("\n"));
