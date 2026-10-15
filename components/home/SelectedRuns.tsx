import Link from "next/link";
import { getProjects } from "@/lib/content/projects";
import { mainPath } from "@/lib/graph/layout";
import { SectionHeader } from "./SectionHeader";
import { RunList, type RunItem } from "./RunList";
import home from "./home.module.css";
import styles from "./SelectedRuns.module.css";

/** 04 — Selected runs (Main.html table; Mobile.html stacked cards). */
export function SelectedRuns() {
  const projects = getProjects();
  const items: RunItem[] = projects.map((p) => ({
    slug: p.slug,
    runId: p.runId,
    title: p.title,
    outcome: p.outcome,
    outcomeLong: p.outcomeLong,
    stack: p.stack,
    status: p.status,
    since: p.since,
    year: p.year,
    trace: mainPath(p.graph),
  }));
  // The design highlights the invoice pipeline (RUN #011) and leads with it on phones.
  const featured = items.find((i) => i.runId === "011")?.slug ?? items[0].slug;
  const count = String(items.length).padStart(2, "0");

  return (
    <section aria-labelledby="runs-h" className={`${home.section} ${styles.section}`} id="work">
      <SectionHeader index="04" title="Selected runs" id="runs-h" meta={<><span className={styles.dOnly}>{count} runs</span><span className={styles.mOnly}>{count}</span></>} markMobile={{ left: "30%", width: "22%" }} />
      <RunList items={items} featured={featured} />
      <div className={styles.allRuns}>
        <Link href="/work" className={styles.allRunsLink}>
          All runs {items.length} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
