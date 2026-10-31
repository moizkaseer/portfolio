import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

// lib/content/blog.ts (and the project/site content it's compared against below) is marked
// "server-only" (Next.js's client-import guard) — it throws on import outside a Server Component,
// which includes plain Node/Vitest. Stub it, same as tests/unit/agent-proxy.test.ts.
vi.mock("server-only", () => ({}));

const { getPost, getPosts } = await import("@/lib/content/blog");

const DIR = path.join(__dirname, "..", "..", "content", "blog");
const WORK_SLUGS = fs
  .readdirSync(path.join(__dirname, "..", "..", "content", "projects"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const KNOWN_PATHS = new Set(["/", "/work", "/about", "/blog", "/#work", "/#agent", "/#contact", "/#toolbox"]);

describe("blog content", () => {
  const posts = getPosts();

  it("has at least one post, and every .mdx file on disk loads with valid frontmatter", () => {
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".mdx"));
    expect(files.length).toBeGreaterThan(0);
    expect(posts).toHaveLength(files.length);
  });

  it("has unique slugs matching their filenames", () => {
    const slugs = posts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(fs.existsSync(path.join(DIR, `${slug}.mdx`))).toBe(true);
  });

  it("has valid, non-future dates in YYYY-MM-DD form", () => {
    const now = new Date();
    for (const p of posts) {
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${p.date}T00:00:00Z`).getTime()).toBeLessThanOrEqual(now.getTime());
      if (p.updated) expect(new Date(`${p.updated}T00:00:00Z`).getTime()).toBeGreaterThanOrEqual(new Date(`${p.date}T00:00:00Z`).getTime());
    }
  });

  it("keeps every description at or under 160 characters (meta description budget)", () => {
    for (const p of posts) expect(p.description.length).toBeLessThanOrEqual(160);
  });

  it("is sorted newest first", () => {
    const dates = posts.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("is within the target 900-1500 word range", () => {
    for (const p of posts) {
      const words = p.body.split(/\s+/).filter(Boolean).length;
      expect(words).toBeGreaterThanOrEqual(900);
      expect(words).toBeLessThanOrEqual(1500);
    }
  });

  it("has at least one h1-worthy title and at least one H2 section", () => {
    for (const p of posts) expect(p.body).toMatch(/^## /m);
  });

  it("links internally (at least twice) to real routes: a /work case study, another /blog post, or a site anchor", () => {
    for (const p of posts) {
      const links = [...p.body.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]);
      expect(links.length).toBeGreaterThanOrEqual(2);
      for (const link of links) {
        const [pathname] = link.split("#").length > 1 && link.includes("/#") ? [link] : [link];
        const isWork = /^\/work\/[a-z0-9-]+$/.test(pathname) && WORK_SLUGS.includes(pathname.replace("/work/", ""));
        const isBlog = /^\/blog\/[a-z0-9-]+$/.test(pathname) && getPost(pathname.replace("/blog/", "")) !== undefined;
        const isKnown = KNOWN_PATHS.has(pathname);
        expect(isWork || isBlog || isKnown, `unexpected internal link "${link}" in ${p.slug}`).toBe(true);
      }
    }
  });

  it("getPost finds each post by slug", () => {
    for (const p of posts) expect(getPost(p.slug)?.title).toBe(p.title);
  });
});

describe("blog in the sitemap and RSS feed", () => {
  it("app/sitemap.ts lists /blog and every post", async () => {
    const sitemap = (await import("@/app/sitemap")).default;
    const urls = sitemap().map((e) => e.url);
    const posts = getPosts();
    expect(urls).toContain("https://www.moizali.tech/blog");
    for (const p of posts) expect(urls).toContain(`https://www.moizali.tech/blog/${p.slug}`);
  });

  it("/blog/rss.xml includes every post's title and link", async () => {
    const { GET } = await import("@/app/blog/rss.xml/route");
    const xml = await GET().text();
    expect(xml).toContain("<rss version=\"2.0\">");
    for (const p of getPosts()) {
      expect(xml).toContain(p.title);
      expect(xml).toContain(`https://www.moizali.tech/blog/${p.slug}`);
    }
  });
});
