/** Phase 5 — the agent that drives the site (C1), in demo replay mode (no model configured in tests). */
import { test, expect, type Page } from "@playwright/test";
import { axeViolations } from "./helpers/axe";

const home = async (page: Page) => {
  await page.goto("/");
  await page.locator("[data-hero-stage][data-ready]").waitFor();
};
const panel = (page: Page) => page.locator("[data-agent-panel-el]");

test.describe("agent — loading", () => {
  test("nothing of the agent is loaded until the visitor asks", async ({ page }) => {
    await home(page);
    await expect(page.locator("[data-agent-live]")).toHaveCount(0);
    await expect(page.locator(".agent-ghost")).toHaveCount(0);
    await page.locator("#agent").scrollIntoViewIfNeeded();
    await page.locator("#ask-agent").focus();
    await expect(page.locator("[data-agent-terminal] [data-agent-live]")).toBeVisible();
    await expect(page.locator("#agent")).toContainText("Demo replay");
  });

  test("the API says demo when no model is configured", async ({ request }) => {
    const res = await request.post("/api/agent", { data: { messages: [] } });
    expect(res.status()).toBe(503);
    expect(await res.json()).toEqual({ demo: true });
  });
});

test.describe("agent — demo replay drives the site", () => {
  test("“Show me your best project”: scroll, highlight, open — and the conversation follows", async ({ page }, info) => {
    test.setTimeout(60_000);
    await home(page);
    if (info.project.name === "phone") {
      await page.locator("[data-askbar]").click();
      await panel(page).getByRole("button", { name: "Show me your best project" }).click();
      // while the agent acts, the sheet shrinks to a pill with the current action
      await expect(panel(page)).toHaveAttribute("data-acting", "true", { timeout: 10_000 });
    } else {
      await page.locator("#agent").scrollIntoViewIfNeeded();
      await page.locator("#agent").getByRole("button", { name: "Show me your best project" }).click();
      await expect(page.locator(".agent-ghost")).toHaveAttribute("data-on", "true", { timeout: 10_000 });
    }
    await expect(page).toHaveURL(/\/work\/invoice-extraction-pipeline$/, { timeout: 25_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("[Invoice extraction pipeline]");
    const log = panel(page).getByRole("log");
    await expect(log).toContainText('ui.scroll_to("work")');
    await expect(log).toContainText('ui.highlight_project("invoice-extraction-pipeline")');
    await expect(log.locator('[data-state="done"]', { hasText: 'ui.open_project("invoice-extraction-pipeline")' })).toBeVisible();
    await expect(log).toContainText("This is RUN #011, [Invoice extraction pipeline].");
    await expect(panel(page)).toContainText("Demo replay");
  });

  test("the visitor takes control: a scroll cancels the rest", async ({ page }, info) => {
    test.skip(info.project.name === "phone");
    test.setTimeout(40_000);
    await home(page);
    await page.locator("#agent").scrollIntoViewIfNeeded();
    await page.locator("#agent").getByRole("button", { name: "Show me your best project" }).click();
    await expect(page.locator(".agent-ghost")).toHaveAttribute("data-on", "true", { timeout: 10_000 });
    await page.mouse.move(300, 300);
    await page.mouse.wheel(0, 400);
    const log = panel(page).getByRole("log");
    await expect(log).toContainText("control returned to you");
    await expect(log.locator('[data-state="cancelled"]').first()).toBeVisible();
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/$/); // the run report was never opened
  });

  test("“switch to dark mode” from day shift", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("mr-theme", "light"));
    await home(page);
    await page.locator("#agent").scrollIntoViewIfNeeded();
    await page.locator("#ask-agent").focus();
    const input = page.locator("#agent-input-section");
    await input.fill("switch to dark mode");
    await input.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", { timeout: 10_000 });
  });

  test("Ask the agent from the command palette", async ({ page }) => {
    await home(page);
    await page.keyboard.press("Control+K");
    await page.getByRole("option", { name: /Ask the agent/ }).click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).locator("#agent-input-panel")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel(page)).toHaveCount(0);
  });

  test("six questions per session", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/work");
    await page.locator(".agent-pill:visible, [data-askbar]:visible").first().click();
    const input = page.locator("#agent-input-panel");
    for (let i = 0; i < 6; i++) {
      await input.fill(`question ${i}`);
      await input.press("Enter");
      await expect(panel(page).getByRole("log").locator("p", { hasText: "demo replay with a few recorded answers" })).toHaveCount(i + 1, { timeout: 8000 });
      await expect(panel(page).getByRole("button", { name: /Send/ })).toBeVisible({ timeout: 8000 });
    }
    await input.fill("one more");
    await input.press("Enter");
    await expect(panel(page)).toContainText("That's the limit for one session");
  });

  test("reduced motion: no glide, the actions still happen", async ({ browser }, info) => {
    test.skip(info.project.name === "phone");
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: info.project.use.viewport! });
    const page = await ctx.newPage();
    await home(page);
    await page.locator("#agent").scrollIntoViewIfNeeded();
    await page.locator("#agent").getByRole("button", { name: "Show me your best project" }).click();
    await expect(page).toHaveURL(/\/work\/invoice-extraction-pipeline$/, { timeout: 25_000 });
    await expect(page.locator(".agent-ghost")).toHaveCount(0);
    await ctx.close();
  });

  test("no axe violations with the agent open", async ({ page }) => {
    await page.goto("/work");
    await page.locator(".agent-pill:visible, [data-askbar]:visible").first().click();
    await expect(panel(page)).toBeVisible();
    expect((await axeViolations(page)).violations).toEqual([]);
  });
});
