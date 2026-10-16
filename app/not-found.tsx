import type { Metadata } from "next";
import Link from "next/link";
import home from "@/components/home/home.module.css";
import { FailedTrace } from "@/components/notfound/FailedTrace";
import styles from "./not-found.module.css";

export const metadata: Metadata = { title: "Run failed: route not found", robots: { index: false } };

/** 404 — "Run failed: route not found", as a run report (brief §4, Phase 7). */
export default function NotFound() {
  return (
    <div className={`${home.section} ${styles.page}`}>
      <div className={styles.crumbs}>
        <span>
          <Link href="/" className={`${styles.crumbLink} text-link`}>
            ← Home
          </Link>
          <span className={styles.muted}> / RUN #404</span>
        </span>
        <Link href="/work" className={`${styles.muted} text-link`}>
          All runs →
        </Link>
      </div>
      <section aria-labelledby="nf-title" className={styles.header}>
        <div className={styles.meta}>
          <span>RUN #404</span>
          <span className={styles.status}>
            <span aria-hidden="true" className={styles.ledFail} />
            Failed
          </span>
          <span className={styles.muted}>0 steps completed · 1 error</span>
        </div>
        <h1 id="nf-title" className={styles.title}>
          Run failed: <em>route not found.</em>
        </h1>
        <p className={styles.lead}>The page you asked for isn&apos;t here — it may have moved, or the link has a typo.</p>
        <div className={styles.actions}>
          <Link href="/" className={styles.retry} data-label="↻ Retry">
            <span aria-hidden="true" className={styles.retryIcon}>
              ↻
            </span>
            <span className="roll" data-label="Retry">
              <span>Retry</span>
            </span>
          </Link>
          <Link href="/work" className={styles.secondary}>
            <span className="roll" data-label="See all runs">
              <span>See all runs</span>
            </span>
          </Link>
        </div>
      </section>
      <FailedTrace />
    </div>
  );
}
