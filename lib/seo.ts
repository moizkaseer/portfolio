import { site } from "@/lib/content/site";

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
    name: site.name,
    jobTitle: site.positioning,
    description: site.summary,
    url: siteUrl(),
    ...(site.city.startsWith("[") ? {} : { address: { "@type": "PostalAddress", addressLocality: site.city } }),
    ...(sameAs.length ? { sameAs } : {}),
  };
}
