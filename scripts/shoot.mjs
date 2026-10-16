// Quick screenshot helper: node scripts/shoot.mjs <url> <out.png> <width> <height> [theme] [fullPage] [reducedMotion]
import { chromium } from "@playwright/test";

const [url, out, w = "1440", h = "900", theme = "dark", full = "0", reduced = "0"] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: +w, height: +h },
  reducedMotion: reduced === "1" ? "reduce" : "no-preference",
});
await ctx.addInitScript((t) => {
  try { localStorage.setItem("mr-theme", t); } catch {}
}, theme);
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: out, fullPage: full === "1" });
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
