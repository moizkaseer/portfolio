/** Phase 4 — /work index, run reports, trace replay, title morph, and the home JS budget. */
import { gzipSync } from "node:zlib";
import { test, expect } from "@playwright/test";
import { axeViolations } from "./helpers/axe";

const RUN = "/work/invoice-extraction-pipeline";

test.describe("/work index", () => {
  test("lists every run and filters by category", async ({ page }, info) => {
    await page.goto("/work");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("All runs.");
    const rows = info.project.name === "phone" ? page.locator("[data-work-card]") : page.locator("[data-work-row]");
    await expect(rows).toHaveCount(4);
    await page.getByRole("button", { name: /^Agents/ }).click();
    await expect(page.getByRole("button", { name: /^Agents/ })).toHaveAttribute("aria-pressed", "true");
    await expect(rows).toHaveCount(2);
    await expect(page.getByRole("button", { name: /^Tools/ })).toBeDisabled();
    await page.getByRole("button", { name: /^All/ }).click();
    await expect(rows).toHaveCount(4);
  });

  test("nav marks Work as the current section", async ({ page }, info) => {
    test.skip(info.project.name === "phone", "the phone nav has no section links");
    await page.goto("/work");
    const work = page.locator('header nav a[data-nav="work"]');
    await expect(work).toHaveCSS("border-bottom-width", "1px");
    await page.goto("/");
    await expect(work).toHaveCSS("border-bottom-width", "0px");
  });
});

test.describe("run report", () => {
  test("freeze run-report: the design's frame", async ({ page }) => {
    await page.goto(`${RUN}?freeze=run-report`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("[Invoice extraction pipeline]");
    await expect(page.locator("[data-status]")).toHaveText("Replaying · 4 / 6");
    await expect(page.locator("[data-elapsed]")).toHaveText("1.34s");
    await expect(page.locator('[role="img"][aria-label^="Workflow: Invoice email arrives → Extract fields"]')).toBeAttached();
    // desktop grid and phone stack show the same states
    for (const [id, state] of [["validate", "running"], ["review", "pending"], ["trigger", "done"]]) {
      await expect(page.locator(`[data-node="${id}"]:visible`)).toHaveAttribute("data-state", state);
    }
  });

  test("the replay autoplays once in view, finishes, and Replay / Speed work", async ({ page }) => {
    await page.clock.install();
    await page.goto(RUN);
    await page.locator("[data-trace-terminal]").scrollIntoViewIfNeeded();
    await page.clock.runFor(2600);
    await expect(page.locator("[data-status]")).toHaveText("Complete · 6 / 6");
    await expect(page.locator('[data-node="post-to-ledger"]:visible')).toHaveAttribute("data-state", "done");
    await page.getByRole("button", { name: /^Replay$/ }).click();
    await page.clock.runFor(100);
    await expect(page.locator("[data-status]")).toHaveText("Replaying · 1 / 6");
    await page.getByRole("button", { name: /speed/i }).click();
    await expect(page.getByRole("button", { name: /speed/i })).toHaveText("Speed 2×");
  });

  test("reduced motion: the finished run, no autoplay", async ({ browser }, info) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: info.project.use.viewport! });
    const page = await ctx.newPage();
    await page.goto(RUN);
    await page.locator("[data-trace-terminal]").scrollIntoViewIfNeeded();
    await expect(page.locator("[data-status]")).toHaveText("Complete · 6 / 6");
    await ctx.close();
  });

  test("breadcrumb and Next run", async ({ page }) => {
    await page.goto(RUN);
    await expect(page.getByRole("link", { name: "← All runs" })).toHaveAttribute("href", "/work");
    await page.locator("[data-next-run]").click();
    await expect(page).toHaveURL(/\/work\/lead-research-agent$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("[Lead research agent]");
  });

  test("every run report renders; brief §6 sections come from MDX", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    for (const slug of ["support-inbox-agent", "invoice-extraction-pipeline", "lead-research-agent", "weekly-ops-report"]) {
      await page.goto(`/work/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("heading", { name: /— The problem$/ })).toBeVisible();
      await expect(page.getByRole("heading", { name: /— Decisions & tradeoffs$/ })).toBeVisible();
    }
    // without a trace.json there is no replay: Results is 02 and the MDX sections follow
    await page.goto("/work/support-inbox-agent");
    await expect(page.getByRole("heading", { name: "02 — Results" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "03 — The problem" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("an unknown run shows the not-found page and is not indexed", async ({ page }) => {
    // With Cache Components, unlisted slugs render on request; the first render may stream a
    // 200 before notFound() runs, in which case Next.js marks the page noindex.
    const res = await page.goto("/work/does-not-exist");
    expect([200, 404]).toContain(res!.status());
    await expect(page.getByText(/could not be found/i)).toBeVisible();
    if (res!.status() === 200) await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test.describe("title morph", () => {
  test("opening a run from home navigates inside a view transition", async ({ page }, info) => {
    test.skip(info.project.name === "phone");
    await page.addInitScript(() => {
      const w = window as unknown as { __vt: number };
      w.__vt = 0;
      const orig = document.startViewTransition?.bind(document);
      if (orig)
        document.startViewTransition = ((arg: Parameters<typeof orig>[0]) => {
          w.__vt += 1;
          return orig(arg);
        }) as typeof document.startViewTransition;
    });
    await page.goto("/");
    await page.locator("[data-hero-stage][data-ready]").waitFor();
    const row = page.locator('[data-run="lead-research-agent"]');
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await expect(page).toHaveURL(/\/work\/lead-research-agent$/);
    expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBeGreaterThan(0);
  });
});

test.describe("quality", () => {
  for (const url of ["/work", `${RUN}?freeze=run-report`]) {
    for (const theme of ["dark", "light"]) {
      test(`${url.split("?")[0]}: no axe violations (${theme})`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("mr-theme", t), theme);
        await page.goto(url);
        expect((await axeViolations(page)).violations).toEqual([]);
      });
    }
  }

  test("no horizontal scroll on /work and run reports", async ({ page }) => {
    for (const w of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width: w, height: 900 });
      for (const url of ["/work", `${RUN}?freeze=run-report`]) {
        await page.goto(url);
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${url} @ ${w}`).toBeLessThanOrEqual(w);
      }
    }
  });

  test("home initial JS stays within the 190KB budget (owner decision)", async ({ request }, info) => {
    test.skip(info.project.name === "phone");
    const html = await (await request.get("/")).text();
    const scripts = [...new Set(html.match(/\/_next\/static\/chunks\/[^"]+\.js/g) ?? [])];
    let total = 0;
    for (const s of scripts) total += gzipSync(await (await request.get(s)).body()).length;
    console.log(`home initial JS: ${(total / 1024).toFixed(1)}KB gz`);
    expect(total / 1024).toBeLessThanOrEqual(190);
  });
});
