/**
 * Hero + C2 prompt behaviour: visitor takeover, chips, keyboard, generic fallback,
 * reduced motion, accessibility.
 */
import { test, expect } from "@playwright/test";
import { axeViolations } from "./helpers/axe";
import { REDUCED_MOTION_STATE, TEMPLATES, deriveVisuals } from "../../lib/motion/hero-motion";

test.describe("hero behaviour", () => {
  test("h1 reads as the plain sentence", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-hero-stage][data-ready]").waitFor();
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("I build agents that do the work.");
  });

  test("a chip builds its system and stops the autoplay for good", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await page.locator("[data-hero-stage][data-ready]").waitFor();
    await page.getByRole("button", { name: "Monday KPI report" }).click();
    await expect(page.locator("#task-input")).toHaveValue(TEMPLATES[2].prompt);
    await page.clock.runFor(4000); // 5 × 200 reveal + 160 + 4 × 480 run + 600 settle
    await expect(page.locator("[data-box][data-shown='true']")).toHaveCount(5);
    await expect(page.locator("[data-box]").first()).toContainText("Monday 09:00");
    await expect(page.locator("[data-underline]")).toHaveAttribute("data-lit", "true");
    await expect(page.getByText("Generated 5 steps: monday 09:00, then pull the metrics", { exact: false })).toBeAttached();
    // the prompt never types an example again (one full hero cycle later it is unchanged)
    test.setTimeout(90_000);
    await page.clock.runFor(12_000);
    await expect(page.locator("#task-input")).toHaveValue(TEMPLATES[2].prompt);
  });

  test("typing your own task + Enter: keyword match and the generic fallback", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await page.locator("[data-hero-stage][data-ready]").waitFor();
    const input = page.locator("#task-input");
    await input.focus();
    await input.fill("Chase unpaid invoices every Friday");
    await input.press("Enter");
    await page.clock.runFor(4000);
    await expect(page.locator("[data-box]").first()).toContainText("Invoice email arrives");

    await input.fill("Water the office plants");
    await input.press("Enter");
    await page.clock.runFor(4000);
    await expect(page.locator("[data-box]").first()).toContainText("When it happens");
    await expect(page.locator("[data-summary]:visible, [data-summary-m]:visible")).toContainText(/drafted from your words|human check/);
  });

  test("keyboard only: Tab reaches the input, chips and Generate", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-hero-stage][data-ready]").waitFor();
    const input = page.locator("#task-input");
    await input.focus();
    await page.keyboard.type("Reply to support tickets");
    await page.keyboard.press("Tab"); // Generate
    await expect(page.getByRole("button", { name: /Generate/ })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Invoices → ledger" })).toBeFocused();
  });

  test("reduced motion: finished state, nothing moves", async ({ browser }, info) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: info.project.use.viewport! });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.locator("[data-hero-stage][data-ready]").waitFor();
    const v = deriveVisuals(REDUCED_MOTION_STATE, "user");
    await expect(page.locator("[data-line]")).toHaveCount(4);
    for (const [i, s] of v.hero.lines.entries()) await expect(page.locator(`[data-line="${i}"]`)).toHaveAttribute("data-status", s);
    await expect(page.locator("#task-input")).toHaveValue(TEMPLATES[0].prompt);
    await expect(page.locator("[data-box][data-shown='true']")).toHaveCount(5);
    await expect(page.locator("[data-hero-stage]")).toHaveAttribute("data-static", "true");
    const p1 = await page.locator("[data-packet]").boundingBox();
    await page.waitForTimeout(1500);
    expect(await page.locator("[data-packet]").boundingBox()).toEqual(p1);
    // builds are instant
    await page.getByRole("button", { name: "Lead research" }).click();
    await expect(page.locator("[data-box]").first()).toContainText("New form lead");
    await expect(page.locator("[data-box][data-shown='true']")).toHaveCount(5);
    await ctx.close();
  });

  test("the loop pauses when the hero and prompt are off screen", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await page.locator("[data-hero-stage][data-ready]").waitFor();
    await page.clock.runFor(2000);
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.height = "4000px";
      document.querySelector("main")!.appendChild(spacer);
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.clock.runFor(500);
    const before = await page.locator("[data-line='1']").getAttribute("data-status");
    await page.clock.runFor(10_000);
    expect(await page.locator("[data-line='1']").getAttribute("data-status")).toBe(before);
  });

  test("no axe violations in the hero + prompt", async ({ page }) => {
    await page.goto("/?freeze=prompt-done");
    const { violations } = await axeViolations(page, "[data-hero-stage]");
    expect(violations).toEqual([]);
  });
});
