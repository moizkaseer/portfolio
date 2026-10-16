import type { Metadata } from "next";
import { site } from "@/lib/content/site";
import toolbox from "@/content/toolbox.json";

/**
 * The site's absolute URL for canonical links, sitemap, OG and JSON-LD. Uses NEXT_PUBLIC_SITE_URL
 * when set, else the domain from content/site.json (moizali.tech) if it is a real host name,
 * else Vercel's production URL, else localhost.
 */
export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(site.domain)) return `https://${site.domain}`;
  // on Vercel, before the domain is set: the project's production URL (a system variable)
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const abs = (path: string) => `${siteUrl()}${path}`;

/** Person (home page JSON-LD). Placeholders and missing links are left out rather than published. */
export function personJsonLd() {
  const sameAs = site.socials.map((s) => s.url).filter((u): u is string => !!u);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${siteUrl()}/#person`,
    name: site.name,
    jobTitle: site.positioning,
    description: site.summary,
    url: siteUrl(),
    email: `mailto:${site.email}`,
    knowsAbout: ["AI agents", "Workflow automation", "LLM evaluation", "Multi-agent systems", "Machine learning", ...toolbox.groups.flatMap((g) => g.tools)],
    ...(site.city.startsWith("[") ? {} : { address: { "@type": "PostalAddress", addressLocality: site.city, addressCountry: "MK" } }),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/**
 * A page's metadata. openGraph and twitter are nested, so a page that sets them replaces the
 * layout's — every page sets its own, or link previews all read like the home page.
 * The og:image comes from each route's opengraph-image file.
 */
export function pageMetadata({ title, description, path, type = "website" }: { title?: string; description: string; path: string; type?: "website" | "article" | "profile" }): Metadata {
  const full = title ? `${title} — ${site.name}` : `${site.name} — ${site.positioning}`;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: { type, siteName: site.name, locale: "en_US", title: full, description, url: path },
    twitter: { card: "summary_large_image", title: full, description },
  };
}

/** WebSite (home page JSON-LD), tied to the Person by @id. */
export function websiteJsonLd() {
  return { "@context": "https://schema.org", "@type": "WebSite", "@id": `${siteUrl()}/#website`, url: siteUrl(), name: site.name, inLanguage: "en", publisher: { "@id": `${siteUrl()}/#person` } };
}

/** BreadcrumbList for a page under the site root, e.g. [["All runs", "/work"], ["Concord", "/work/concord"]]. */
export function breadcrumbJsonLd(trail: [name: string, path: string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [["Home", "/"] as const, ...trail].map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
  };
}

/** Serialise JSON-LD for a <script> tag (no "</script>" breakouts). */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
