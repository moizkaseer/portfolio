import type { Metadata } from "next";
import Link from "next/link";
import { getProjects } from "@/lib/content/projects";
import { WorkIndex, type WorkItem } from "@/components/work/WorkIndex";
import home from "@/components/home/home.module.css";
import styles from "@/components/work/WorkIndex.module.css";

export const metadata: Metadata = { title: "All runs", description: "Every system I have built, as run reports." };

/** /work — all runs, filterable (brief §4). Not in the design canvas: built from its run table (DESIGN_SPEC §7). */
export default function Work() {
  const items: WorkItem[] = getProjects().map((p) => ({
    slug: p.slug,
    runId: p.runId,
    title: p.title,
    outcome: p.outcome,
    stack: p.stack,
    status: p.status,
    year: p.year,
    category: p.category,
  }));
  return (
    <div className={`${home.section} ${styles.page}`} data-page="work">
      <div className={styles.crumbs}>
        <span>
          <Link href="/" className={styles.crumbLink}>
            ← Home
          </Link>
          <span className={styles.muted}> / Work</span>
        </span>
        <span className={styles.muted}>{String(items.length).padStart(2, "0")} runs</span>
      </div>
      <h1 className={styles.title}>
        All <em>runs.</em>
      </h1>
      <WorkIndex items={items} />
    </div>
  );
}
