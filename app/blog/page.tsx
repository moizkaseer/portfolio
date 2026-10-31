import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/content/blog";
import { abs, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import home from "@/components/home/home.module.css";
import styles from "./blog.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Blog",
  description: "Notes on building AI agents: architecture, free-tier constraints, verification, and what breaks in practice.",
  path: "/blog",
  rss: "/blog/rss.xml",
});

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

/** /blog — posts on building AI agents, newest first. */
export default function Blog() {
  const posts = getPosts();
  return (
    <div className={`${home.section} ${styles.page}`} data-page="blog">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            url: abs("/blog"),
            blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: abs(`/blog/${p.slug}`), datePublished: p.date })),
          },
          breadcrumbJsonLd([["Blog", "/blog"]]),
        ]}
      />
      <div className={styles.crumbs}>
        <span>
          <Link href="/" className={`${styles.crumbLink} text-link`}>
            ← Home
          </Link>
          <span className={styles.muted}> / Blog</span>
        </span>
        <span className={styles.muted}>{String(posts.length).padStart(2, "0")} posts</span>
      </div>
      <h1 className={styles.title}>
        Notes on building <em>agents.</em>
      </h1>
      <p className={styles.lead}>Architecture, free-tier constraints, verification, and what actually broke — written from the projects on this site.</p>
      <ol className={styles.list}>
        {posts.map((p) => (
          <li key={p.slug} className={styles.item}>
            <div className={styles.itemMeta}>
              <time dateTime={p.date}>{formatDate(p.date)}</time>
              <span aria-hidden="true">·</span>
              <span>{p.readingTime} min read</span>
            </div>
            <Link href={`/blog/${p.slug}`} className={styles.itemTitle}>
              {p.title}
            </Link>
            <p className={styles.itemDescription}>{p.description}</p>
            <div className={styles.itemTags}>
              {p.tags.map((t) => (
                <span key={t} className={styles.tag}>
                  {t}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
