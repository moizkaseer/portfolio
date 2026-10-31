/** /blog index and a post page: one h1, nav state, RSS link, no axe violations. */
import { test, expect } from "@playwright/test";
import { axeViolations } from "./helpers/axe";

const SLUG = "what-does-an-ai-agent-engineer-do";

test.describe("/blog index", () => {
  test("lists every post with a title, date and reading time", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Notes on building");
    await expect(page.locator("time")).not.toHaveCount(0);
    await expect(page.getByText("min read").first()).toBeVisible();
  });

  test("nav marks Blog as the current section", async ({ page }, info) => {
    test.skip(!!info.project.use.isMobile, "the phone nav has no section links");
    await page.goto("/blog");
    const blog = page.locator('header nav a[data-nav="blog"]');
    await expect(blog).toHaveCSS("border-bottom-width", "1px");
    await page.goto("/");
    await expect(blog).toHaveCSS("border-bottom-width", "0px");
  });

  test("no axe violations", async ({ page }) => {
    await page.goto("/blog");
    expect((await axeViolations(page)).violations).toEqual([]);
  });
});

test.describe("/blog/[slug]", () => {
  test("renders one h1, the article body, and links through to a post from the index", async ({ page }) => {
    await page.goto("/blog");
    await page.getByRole("link", { name: /What does an AI agent engineer actually do\?/ }).click();
    await expect(page).toHaveURL(new RegExp(`/blog/${SLUG}$`));
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText("What does an AI agent engineer actually do?");
    await expect(page.locator("article a[href='/#contact']")).toHaveCount(1);
  });

  test("no axe violations", async ({ page }) => {
    await page.goto(`/blog/${SLUG}`);
    expect((await axeViolations(page)).violations).toEqual([]);
  });
});

test.describe("/blog navigation (Lenis stays in sync with the route)", () => {
  test("wheel-scrolling to a later post then clicking it opens at the top, not mid-scroll", async ({ page }, info) => {
    test.skip(!!info.project.use.isMobile, "mouse-wheel scrolling is a desktop interaction");
    await page.goto("/blog");
    await page.waitForFunction(() => document.documentElement.classList.contains("lenis"));

    const post = page.locator("a[href^='/blog/']").nth(2); // 3rd post — off-screen on first paint
    await page.mouse.move(600, 400);
    for (let i = 0; i < 30; i++) {
      const box = await post.boundingBox();
      if (box && box.y > 100 && box.y < 700) break;
      await page.mouse.wheel(0, 150);
      await page.waitForTimeout(100);
    }
    // let Lenis settle so its internal target is the scrolled-down position
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

    // a real pointer click at the link (locator.click() would scroll it into view natively)
    const box = await post.boundingBox();
    if (!box) throw new Error("post link has no box");
    await page.mouse.click(box.x + 15, box.y + box.height / 2);
    await expect(page).toHaveURL(/\/blog\/.+/);
    // Before the fix, the router reset scroll to 0 and Lenis dragged it back to the old offset
    // on its next frames, so the reader landed mid-article. Give Lenis time to (not) do that.
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
    await expect(page.locator("#post-title")).toBeInViewport();

    await page.goBack();
    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Notes on building");
  });
});

test.describe("blog machine-readable surfaces", () => {
  test("sitemap and RSS include every post", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/blog</loc>");
    expect(sitemap).toContain(`/blog/${SLUG}</loc>`);
    const rss = await request.get("/blog/rss.xml");
    expect(rss.headers()["content-type"]).toContain("application/rss+xml");
    const rssText = await rss.text();
    expect(rssText).toContain("<rss version=\"2.0\">");
    expect(rssText).toContain(`/blog/${SLUG}`);
  });
});
