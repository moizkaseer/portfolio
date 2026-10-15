/** Phase 3 — home sections, the C3 rail, contact form and API. */
import { test, expect } from "@playwright/test";
import { axeViolations } from "./helpers/axe";

const ready = async (page: import("@playwright/test").Page, url = "/") => {
  await page.goto(url);
  await page.locator("[data-hero-stage][data-ready]").waitFor();
};

test.describe("home structure", () => {
  test("sections in order with the brief's numbering (Proof omitted, Contact is 08)", async ({ page }) => {
    await ready(page);
    const headers = await page.locator("main [data-rail-tick] > :first-child").allTextContents();
    expect(headers.map((h) => h.trim())).toEqual([
      "03 — How I work",
      "04 — Selected runs",
      "05 — Process",
      "06 — Talk to my agent",
      "07 — Toolbox",
      "08 — Contact",
    ]);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("no horizontal scroll at any width", async ({ page }) => {
    for (const w of [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto("/?freeze=home-hover");
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `width ${w}`).toBeLessThanOrEqual(w);
    }
  });

  for (const theme of ["dark", "light"]) {
    test(`whole page: no axe violations (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("mr-theme", t), theme);
      await page.goto("/?freeze=home-hover");
      expect((await axeViolations(page)).violations).toEqual([]);
    });
  }
});

test.describe("04 selected runs", () => {
  test("desktop: hover opens a row (media, outcome, trace that plays to the end)", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await ready(page);
    const row = page.locator('[data-run="lead-research-agent"]');
    await row.scrollIntoViewIfNeeded();
    await row.hover();
    await expect(row).toHaveAttribute("data-active", "true");
    await expect(row.locator("[data-trace]")).toHaveAttribute("data-current", "4", { timeout: 4000 });
    await expect(row).toHaveAttribute("href", "/work/lead-research-agent");
  });

  test("desktop: keyboard focus opens the row too", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await ready(page);
    await page.locator('[data-run="weekly-ops-report"]').focus();
    await expect(page.locator('[data-run="weekly-ops-report"]')).toHaveAttribute("data-active", "true");
  });

  test("freeze home-hover: RUN #011 highlighted by the agent, as in the design", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/?freeze=home-hover");
    const row = page.locator('[data-run="invoice-extraction-pipeline"]');
    await expect(row).toHaveAttribute("data-active", "true");
    await expect(row.getByText("agent · highlight_project")).toBeVisible();
    await expect(row.locator("[data-trace]")).toHaveAttribute("data-current", "2");
  });

  test("phone: stacked cards, the featured run first with its media", async ({ page }, info) => {
    test.skip(info.project.name !== "phone");
    await ready(page);
    const cards = page.locator("[data-card]");
    await expect(cards).toHaveCount(4);
    await expect(cards.first()).toHaveAttribute("data-card", "invoice-extraction-pipeline");
    await expect(cards.first().getByRole("img", { name: /Screen recording/ })).toBeVisible();
  });
});

test.describe("07 toolbox", () => {
  test("hovering a tool highlights the runs that use it", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await ready(page);
    await page.getByRole("button", { name: /^\[Slack\]/ }).hover();
    await expect(page.locator('[data-run="weekly-ops-report"]')).toHaveAttribute("data-tool-lit", "true");
    await expect(page.locator('[data-run="support-inbox-agent"]')).toHaveAttribute("data-tool-dim", "true");
  });
});

test.describe("C2 → contact", () => {
  test('"Build this with me" prefills the form with the task and its steps', async ({ page }) => {
    await ready(page);
    await page.getByRole("button", { name: "Lead research" }).click();
    await page.getByRole("link", { name: /Build this with me/ }).click();
    const task = page.getByLabel(/What should be automated/);
    await expect(task).toHaveValue(/Research new leads and add them to the CRM/);
    await expect(task).toHaveValue(/1\. New form lead \(trigger\)/);
    await expect(page.getByText("The system you sketched above is attached.")).toBeVisible();
  });
});

test.describe("08 contact form", () => {
  test("client validation, then a successful run shows the trace", async ({ page }) => {
    await ready(page);
    await page.route("/api/contact", (r) => r.fulfill({ json: { ok: true } }));
    const form = page.locator("#contact form");
    await form.scrollIntoViewIfNeeded();
    await form.getByRole("button", { name: /Run/ }).click();
    await expect(form.getByText("Tell me a bit more")).toBeVisible();
    await expect(form.getByText("That email doesn't look right.")).toBeVisible();
    await page.getByLabel(/What should be automated/).fill("Copy invoices from Gmail into Xero every Friday");
    await page.getByLabel(/^.*Email$/).fill("someone@example.com");
    await form.getByRole("button", { name: /Run/ }).click();
    await expect(form.getByRole("status")).toHaveText("Received. I'll reply by email.");
    await expect(form.locator("[data-trace]")).toContainText("queued for");
  });

  test("API: invalid → 422, honeypot → silently ok, unconfigured delivery → 503, rate limit → 429", async ({ request }, info) => {
    test.skip(info.project.name !== "desktop");
    const ip = { "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200)}` };
    const bad = await request.post("/api/contact", { data: { task: "hi", email: "nope" }, headers: ip });
    expect(bad.status()).toBe(422);
    expect((await bad.json()).fields).toHaveProperty("email");

    const bot = await request.post("/api/contact", { data: { task: "x", email: "x", company: "ACME" }, headers: ip });
    expect(bot.status()).toBe(200);

    const valid = { task: "Reconcile invoices from Gmail into our accounting tool", where: "Gmail", email: "a@example.com" };
    const first = await request.post("/api/contact", { data: valid, headers: ip });
    expect(first.status()).toBe(503); // test build has no RESEND_API_KEY: nothing is silently lost
    for (let i = 0; i < 4; i++) await request.post("/api/contact", { data: valid, headers: ip });
    const limited = await request.post("/api/contact", { data: valid, headers: ip });
    expect(limited.status()).toBe(429);
  });

  test("copy email shows the toast", async ({ page, context }, info) => {
    test.skip(info.project.name !== "desktop");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await ready(page);
    await page.locator("#contact").getByRole("button", { name: /yourdomain/ }).click();
    await expect(page.getByText("Copied — talk soon")).toBeVisible();
  });
});

test.describe("05 process", () => {
  test("desktop: the pinned diagram advances with scroll", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await ready(page);
    const pin = page.locator("[data-process-pin]");
    const box = await pin.boundingBox();
    const top = await page.evaluate(() => window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y), top + box!.y + 10);
    await expect(page.locator("[data-process-pin] [data-step]")).toHaveAttribute("data-step", "0");
    await page.evaluate((y) => window.scrollTo(0, y), top + box!.y + box!.height - 900 - 10);
    await expect(page.locator("[data-process-pin] [data-step]")).toHaveAttribute("data-step", "4");
  });

  test("phone: the stacked list", async ({ page }, info) => {
    test.skip(info.project.name !== "phone");
    await ready(page);
    await expect(page.locator("[data-process-list] li")).toHaveCount(5);
    await expect(page.locator("[data-process-list] li").first()).toBeVisible();
  });
});

test.describe("C3 rail", () => {
  test("continues from the prompt, ticks into every section header and draws with scroll", async ({ page }, info) => {
    await ready(page);
    const rail = page.locator("[data-rail] svg");
    await expect(rail.locator("path")).toHaveCount(2 + 6);
    // starts at the corner where the hero's wire turns into the prompt underline
    const geo = await page.evaluate((phone) => {
      const stage = document.querySelector("[data-hero-stage]")!.getBoundingClientRect();
      const path = document.querySelector("[data-rail] svg path")!.getAttribute("d")!;
      const [, x, y] = path.match(/M([\d.]+) ([\d.]+)/)!.map(Number);
      const s = stage.width / (phone ? 390 : 1440);
      return { x, y, ex: stage.left + (phone ? 382 : 1400) * s, ey: stage.top + window.scrollY + (phone ? 1283 : 1300) * s };
    }, info.project.name === "phone");
    expect(Math.abs(geo.x - geo.ex)).toBeLessThan(1);
    expect(Math.abs(geo.y - geo.ey)).toBeLessThan(1);
    const before = await page.locator("[data-rail] svg path").nth(1).evaluate((p) => getComputedStyle(p).strokeDashoffset);
    await page.locator("#toolbox").scrollIntoViewIfNeeded();
    await expect
      .poll(() => page.locator("[data-rail] svg path").nth(1).evaluate((p) => getComputedStyle(p).strokeDashoffset))
      .not.toBe(before);
  });

  test("reduced motion: fully drawn, no packet", async ({ browser }, info) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: info.project.use.viewport! });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.locator("[data-rail] svg").waitFor();
    expect(await page.locator("[data-rail] svg path").nth(1).evaluate((p) => parseFloat(getComputedStyle(p).strokeDashoffset))).toBe(0);
    await ctx.close();
  });
});
