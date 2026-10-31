import { getPosts } from "@/lib/content/blog";
import { site } from "@/lib/content/site";
import { abs } from "@/lib/seo";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const rfc822 = (iso: string) => new Date(`${iso}T00:00:00Z`).toUTCString();

/** /blog/rss.xml — RSS 2.0 feed of every post, newest first (static). */
export function GET() {
  const posts = getPosts();
  const items = posts
    .map(
      (p) => `
    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(abs(`/blog/${p.slug}`))}</link>
      <guid isPermaLink="true">${esc(abs(`/blog/${p.slug}`))}</guid>
      <description>${esc(p.description)}</description>
      <pubDate>${rfc822(p.date)}</pubDate>
    </item>`,
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(site.name)} — Blog</title>
    <link>${esc(abs("/blog"))}</link>
    <description>${esc("Notes on building AI agents: architecture, free-tier constraints, verification, and what breaks in practice.")}</description>
    <language>en</language>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${esc(abs("/blog/rss.xml"))}" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
