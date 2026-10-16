// Measures frame pacing of the hero loop: rAF intervals over 20s, unthrottled and with 4x CPU throttling.
// Usage: node tests/fidelity/fps.mjs <baseUrl>
import { chromium } from "@playwright/test";

const [base = "http://localhost:3100"] = process.argv.slice(2);
const browser = await chromium.launch();
const rows = [];
for (const vp of [{ w: 1440, h: 900, label: "desktop 1440" }, { w: 390, h: 844, label: "phone 390" }]) {
  for (const throttle of [1, 4]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.goto(base, { waitUntil: "networkidle" });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
    const r = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const deltas = [];
          let last = performance.now();
          const longTasks = [];
          new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(e.duration))).observe({ type: "longtask", buffered: false });
          const end = last + 20000;
          const f = (t) => {
            deltas.push(t - last);
            last = t;
            if (t < end) requestAnimationFrame(f);
            else resolve({ deltas, longTasks });
          };
          requestAnimationFrame(f);
        }),
    );
    const d = r.deltas.slice(1).sort((a, b) => a - b);
    const avg = d.reduce((a, b) => a + b, 0) / d.length;
    rows.push({
      viewport: vp.label,
      cpu: `${throttle}x`,
      avgFps: (1000 / avg).toFixed(1),
      p95FrameMs: d[Math.floor(d.length * 0.95)].toFixed(1),
      framesOver20ms: `${((100 * d.filter((x) => x > 20).length) / d.length).toFixed(2)}%`,
      longTasks: r.longTasks.length,
    });
    await ctx.close();
  }
}
await browser.close();
console.table(rows);
