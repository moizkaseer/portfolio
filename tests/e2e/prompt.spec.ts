/** C2 — the smart engine for "What should run itself?" and the hand-off to contact and the agent. */
import { test, expect, type Page } from "@playwright/test";

const SMART = [
  { kind: "Trigger", title: "New supplier email" },
  { kind: "Model", title: "Read the quote" },
  { kind: "Code", title: "Compare to budget" },
  { kind: "Human", title: "Approve the spend" },
  { kind: "Tool", title: "Reply to supplier" },
];

async function open(page: Page, url: string) {
  await page.goto(url);
  await page.locator("[data-hero-stage][data-ready]").waitFor();
}
const titles = (page: Page) => page.locator("[data-box] [data-title]").allTextContents();

test.describe("smart prompt", () => {
  test("without a model nothing calls the server: the instant templates build it", async ({ page }) => {
    let calls = 0;
    await page.route("/api/prompt", (r) => (calls++, r.fulfill({ json: { nodes: SMART } })));
    await open(page, "/");
    await page.locator("#task-input").focus();
    await page.locator("#task-input").fill("Reconcile receipts every month");
    await page.locator("#task-input").press("Enter");
    await expect(page.locator("[data-box]").first()).toContainText("Invoice email arrives", { timeout: 5000 });
    expect(calls).toBe(0);
    await expect(page.request.post("/api/prompt", { data: { task: "x y z" } }).then((r) => r.status())).resolves.toBe(503);
  });

  test("with a model: the drafted steps replace the template (kinds, titles, summary)", async ({ page }) => {
    await page.route("/api/prompt", async (r) => {
      await new Promise((res) => setTimeout(res, 600));
      await r.fulfill({ json: { nodes: SMART } });
    });
    await open(page, "/?smart=1");
    const input = page.locator("#task-input");
    await input.focus();
    await input.fill("Handle supplier quotes and approve spend");
    await input.press("Enter");
    await expect(page.locator("[data-status-text]:visible, [data-status-text-m]:visible").first()).toContainText(/Designing/);
    await expect.poll(() => titles(page), { timeout: 6000 }).toEqual(SMART.map((n) => n.title));
    await expect(page.locator("[data-summary]:visible, [data-summary-m]:visible").first()).toContainText(/human check/);
    await expect(page.locator('[data-box="3"]')).toHaveAttribute("data-dashed", /true|false/);
  });

  test("slower than 2.5s or an error: silent fallback to the templates", async ({ page }) => {
    await page.route("/api/prompt", async (r) => {
      await new Promise((res) => setTimeout(res, 3500));
      await r.fulfill({ json: { nodes: SMART } }).catch(() => {});
    });
    await open(page, "/?smart=1");
    const input = page.locator("#task-input");
    await input.focus();
    await input.fill("Answer refund emails");
    const t0 = Date.now();
    await input.press("Enter");
    await expect(page.locator("[data-box]").first()).toContainText("Support inbox", { timeout: 6000 });
    expect(Date.now() - t0).toBeLessThan(5000);

    await page.unroute("/api/prompt");
    await page.route("/api/prompt", (r) => r.fulfill({ status: 500, json: { fallback: true } }));
    await input.fill("Water the office plants");
    await input.press("Enter");
    await expect(page.locator("[data-box]").first()).toContainText("When it happens", { timeout: 6000 });
  });

  test("chips stay instant examples (no server call)", async ({ page }) => {
    let calls = 0;
    await page.route("/api/prompt", (r) => (calls++, r.fulfill({ json: { nodes: SMART } })));
    await open(page, "/?smart=1");
    await page.getByRole("button", { name: "Lead research" }).click();
    await expect(page.locator("[data-box]").first()).toContainText("New form lead", { timeout: 5000 });
    expect(calls).toBe(0);
  });

  test("Build this with me: the sentence + steps in plain language, the steps as JSON in a hidden field", async ({ page }) => {
    await page.route("/api/prompt", (r) => r.fulfill({ json: { nodes: SMART } }));
    await open(page, "/?smart=1");
    const input = page.locator("#task-input");
    await input.focus();
    await input.fill("Handle supplier quotes");
    await input.press("Enter");
    await expect.poll(() => titles(page), { timeout: 6000 }).toEqual(SMART.map((n) => n.title));
    await page.waitForTimeout(3000); // the build finishes
    await page.getByRole("link", { name: /Build this with me/ }).click();
    const task = page.getByLabel(/What should be automated/);
    await expect(task).toHaveValue(/Handle supplier quotes/);
    await expect(task).toHaveValue(/4\. Approve the spend \(human\)/);
    const json = JSON.parse(await page.locator('#contact input[name="system"]').inputValue());
    expect(json.nodes).toEqual(SMART);
  });

  test("the agent can talk about the system the visitor built (get_prompt_state)", async ({ page }) => {
    test.setTimeout(45_000);
    await open(page, "/");
    await page.getByRole("button", { name: "Monday KPI report" }).click();
    await page.waitForTimeout(4000);
    await page.locator("#agent").scrollIntoViewIfNeeded();
    await page.locator("#ask-agent").focus();
    const input = page.locator("#agent-input-section");
    await input.fill("Could you really build this?");
    await input.press("Enter");
    await expect(page.locator("[data-agent-live]").first()).toContainText('You described: "Every Monday, send a KPI summary to Slack"', { timeout: 10_000 });
    await expect(page.locator("[data-agent-live]").first()).toContainText("Monday 09:00 → Pull the metrics");
  });
});
