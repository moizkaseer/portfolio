import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("shell", () => {
  test("home renders with one h1, nav, footer and night shift by default", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("header nav[aria-label='Primary']:visible, header button[aria-controls='mobile-menu']:visible")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("theme toggle switches and persists", async ({ page }, info) => {
    test.skip(info.project.name === "phone", "desktop toggle; the phone toggle lives in the menu");
    await page.goto("/");
    await page.locator("header [data-theme-toggle]:visible").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("command palette opens with Ctrl+K and closes with Escape", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+K");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("no axe violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
