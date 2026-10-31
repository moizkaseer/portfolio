import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/content/blog";
import { renderMdx } from "@/lib/content/mdx";
import { abs, breadcrumbJsonLd, pageMetadata, siteUrl } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/content/site";
import home from "@/components/home/home.module.css";
import styles from "./post.module.css";

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const p = getPost((await params).slug);
  if (!p) return {};
  return pageMetadata({
    title: p.title,
    description: p.description,
    path: `/blog/${p.slug}`,
    type: "article",
    article: { publishedTime: p.date, modifiedTime: p.updated ?? p.date, authors: [siteUrl()] },
    rss: "/blog/rss.xml",
  });
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

/** /blog/[slug] — a long-form post, prerendered (generateStaticParams). */
export default async function Post({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const p = getPost(slug);
  if (!p) notFound();
  const others = getPosts().filter((o) => o.slug !== p.slug);
  const body = await renderMdx(p.body, {
    a: ({ href, children }) => (
      <a href={href} className="text-link">
        {children}
      </a>
    ),
  });

  return (
    <div className={`${home.section} ${styles.page}`} data-page="blog">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: p.title,
            description: p.description,
            url: abs(`/blog/${p.slug}`),
            datePublished: p.date,
            dateModified: p.updated ?? p.date,
            mainEntityOfPage: abs(`/blog/${p.slug}`),
            author: { "@type": "Person", "@id": `${siteUrl()}/#person`, name: site.name, url: siteUrl() },
            publisher: { "@type": "Person", "@id": `${siteUrl()}/#person`, name: site.name, url: siteUrl() },
            keywords: p.tags.join(", "),
          },
          breadcrumbJsonLd([["Blog", "/blog"], [p.title, `/blog/${p.slug}`]]),
        ]}
      />
      <div className={styles.crumbs}>
        <span>
          <Link href="/blog" className={`${styles.crumbLink} text-link`}>
            ← Blog
          </Link>
        </span>
        <span className={styles.muted}>
          {formatDate(p.date)} · {p.readingTime} min read
        </span>
      </div>

      <article aria-labelledby="post-title" className={styles.header}>
        <div className={styles.meta}>
          <time dateTime={p.date}>{formatDate(p.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{p.readingTime} min read</span>
        </div>
        <h1 id="post-title" className={styles.title}>
          {p.title}
        </h1>
        <p className={styles.description}>{p.description}</p>
        <div className={styles.tags}>
          {p.tags.map((t) => (
            <span key={t} className={styles.tag}>
              {t}
            </span>
          ))}
        </div>

        <div className={styles.prose}>{body}</div>
      </article>

      {others.length > 0 && (
        <nav aria-label="More posts" className={styles.related}>
          <p className={styles.relatedTitle}>More posts</p>
          <ul className={styles.relatedList}>
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/blog/${o.slug}`} className="text-link">
                  {o.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
