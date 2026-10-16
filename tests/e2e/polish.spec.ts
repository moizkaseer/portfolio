/** Phase 7 — 404, SEO files, about page, micro-interactions, detail pass. */
import { test, expect } from "@playwright/test";
import { axeViolations } from "./helpers/axe";

test.describe("404 — Run failed: route not found", () => {
  test("a run report for a missing page, with ↻ Retry going home", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res!.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Run failed: route not found.");
    await expect(page.getByRole("group", { name: "Run log" })).toContainText("GET /no-such-page");
    await page.getByRole("link", { name: "Retry" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  for (const theme of ["dark", "light"]) {
    test(`no axe violations (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("mr-theme", t), theme);
      await page.goto("/no-such-page");
      expect((await axeViolations(page)).violations).toEqual([]);
    });
  }
});

test.describe("SEO and machine-readable files (from the content files)", () => {
  test("sitemap, robots, llms.txt", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const p of ["/work", "/about", "/work/invoice-extraction-pipeline", "/work/weekly-ops-report"]) expect(sitemap).toContain(`${p}</loc>`);
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
    const llms = await request.get("/llms.txt");
    expect(llms.headers()["content-type"]).toContain("text/plain");
    const text = await llms.text();
    expect(text).toContain("## Runs (case studies)");
    expect(text).toContain("/work/invoice-extraction-pipeline");
    expect(text).toContain("/about");
  });

  test("OG images for every page type", async ({ request }) => {
    for (const p of ["/opengraph-image", "/work/opengraph-image", "/about/opengraph-image", "/work/invoice-extraction-pipeline/opengraph-image"]) {
      const res = await request.get(p, { headers: { "User-Agent": "Mozilla/5.0" } });
      expect(res.status(), p).toBe(200);
      expect(res.headers()["content-type"]).toBe("image/png");
    }
  });

  test("JSON-LD: Person on home, CreativeWork on a run", async ({ page }) => {
    const ld = async () =>
      page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => JSON.parse(e.textContent!)));
    await page.goto("/");
    expect((await ld()).map((d) => d["@type"])).toContain("Person");
    await page.goto("/work/invoice-extraction-pipeline");
    const run = (await ld()).find((d) => d["@type"] === "CreativeWork");
    expect(run.name).toBe("[Invoice extraction pipeline]");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/work\/invoice-extraction-pipeline$/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  });
});

test.describe("/about", () => {
  test("placeholders for bio, now, timeline and photo; nav marks About", async ({ page }, info) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("at work.");
    for (const h of ["01 — Bio", "02 — Now", "03 — Timeline", "04 — Toolbox"]) await expect(page.getByRole("heading", { name: h })).toBeVisible();
    await expect(page.getByRole("img", { name: /Portrait of .* coming soon/ })).toBeVisible();
    if (info.project.name !== "phone") await expect(page.locator('header nav a[data-nav="about"]')).toHaveCSS("border-bottom-width", "1px");
  });

  for (const theme of ["dark", "light"]) {
    test(`no axe violations (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("mr-theme", t), theme);
      await page.goto("/about");
      expect((await axeViolations(page)).violations).toEqual([]);
    });
  }
});

test.describe("micro-interactions", () => {
  test("the cursor dot and magnetic pull (≤ 6px) on desktop", async ({ page }, info) => {
    test.skip(info.project.name === "phone");
    await page.goto("/no-such-page");
    await page.locator("[data-cursor-dot]").waitFor({ state: "attached" });
    const retry = page.getByRole("link", { name: "Retry" });
    const b = (await retry.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.move(b.x + b.width - 1, b.y + 1, { steps: 5 });
    await expect(page.locator("[data-cursor-dot]")).toHaveAttribute("data-on", "true");
    const [x, y] = (await retry.evaluate((e) => e.style.translate)).split(" ").map(parseFloat);
    expect(Math.abs(x)).toBeGreaterThan(0);
    expect(Math.abs(x)).toBeLessThanOrEqual(6);
    expect(Math.abs(y)).toBeLessThanOrEqual(6);
    await page.mouse.move(5, 500);
    await expect(page.locator("[data-cursor-dot]")).toHaveAttribute("data-on", "false");
    await expect.poll(() => retry.evaluate((e) => e.style.translate)).toBe("");
  });

  test("no cursor dot on touch screens", async ({ page }, info) => {
    test.skip(info.project.name !== "phone");
    await page.goto("/about");
    await page.waitForTimeout(2000); // past the idle load
    const dot = page.locator("[data-cursor-dot]");
    if (await dot.count()) await expect(dot).toBeHidden();
  });

  test("no cursor dot with reduced motion", async ({ browser }, info) => {
    test.skip(info.project.name === "phone");
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: info.project.use.viewport! });
    const page = await ctx.newPage();
    await page.goto("/no-such-page");
    await page.locator("[data-cursor-dot]").waitFor({ state: "attached" });
    await page.getByRole("link", { name: "Retry" }).hover();
    await expect(page.locator("[data-cursor-dot]")).toBeHidden();
    expect(await page.getByRole("link", { name: "Retry" }).evaluate((e) => e.style.translate)).toBe("");
    await ctx.close();
  });

  test("button labels roll on hover and are read once", async ({ page }, info) => {
    test.skip(info.project.name === "phone");
    await page.goto("/no-such-page");
    const retry = page.getByRole("link", { name: "Retry" });
    await expect(retry).toHaveAccessibleName("↻ Retry".replace("↻ ", ""));
    const label = retry.locator(".roll > span");
    await retry.hover();
    await expect.poll(() => label.evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m42)).toBeLessThan(-10);
  });

  test("status LEDs pulse slowly (2.4s)", async ({ page }) => {
    await page.goto("/work");
    const led = page.locator(".pulse:visible").first();
    await expect(led).toHaveCSS("animation-duration", "2.4s");
  });
});

test.describe("detail pass", () => {
  test("selection colours and themed scrollbars", async ({ page }) => {
    await page.goto("/about");
    const sel = await page.evaluate(() => {
      const s = getComputedStyle(document.querySelector("h1")!, "::selection");
      return [s.backgroundColor, s.color];
    });
    expect(sel).toEqual(["rgb(255, 79, 26)", "rgb(14, 14, 12)"]);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarColor)).not.toBe("auto");
  });

  test("every focusable element shows a focus indicator", async ({ page }, info) => {
    test.skip(info.project.name === "phone");
    test.setTimeout(90_000);
    for (const [url, tabs] of [["/?freeze=hero-done", 90], ["/about", 40], ["/no-such-page", 30], ["/work", 40], ["/work/invoice-extraction-pipeline", 40]] as const) {
      await page.goto(url);
      const missing: string[] = [];
      for (let i = 0; i < tabs; i++) {
        await page.keyboard.press("Tab");
        const r = await page.evaluate(() => {
          const e = document.activeElement as HTMLElement | null;
          if (!e || e === document.body) return null;
          const s = getComputedStyle(e);
          const ok = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
          return ok ? "" : `${e.tagName} ${e.textContent?.trim().slice(0, 30)}`;
        });
        if (r) missing.push(r);
      }
      expect(missing, url).toEqual([]);
    }
  });

  test("no horizontal scroll at 320, 2560 and phone landscape", async ({ page }) => {
    for (const [w, h] of [[320, 640], [2560, 1440], [844, 390]]) {
      await page.setViewportSize({ width: w, height: h });
      for (const url of ["/", "/about", "/work", "/work/invoice-extraction-pipeline", "/no-such-page"]) {
        await page.goto(url);
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${url} @ ${w}`).toBeLessThanOrEqual(w);
      }
    }
  });

  test("the phone menu fits a landscape phone", async ({ page }, info) => {
    test.skip(info.project.name !== "phone");
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/about");
    await page.getByRole("button", { name: /menu/i }).click();
    const last = page.getByRole("dialog").getByRole("link", { name: /Contact/ });
    await expect(last).toBeInViewport();
  });

  test("fonts are preloaded (no late swap)", async ({ request }) => {
    // Next sends the preloads as a Link header: Geist, Geist Mono, Instrument Serif
    const link = (await request.get("/about")).headers()["link"] ?? "";
    expect(link.match(/rel=preload; as="font"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(link).toContain("GeistMono");
  });
});
