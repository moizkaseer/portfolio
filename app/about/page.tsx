import type { Metadata } from "next";
import Link from "next/link";
import about from "@/content/about.json";
import toolbox from "@/content/toolbox.json";
import { site } from "@/lib/content/site";
import { SectionHeader } from "@/components/home/SectionHeader";
import home from "@/components/home/home.module.css";
import styles from "./about.module.css";

export const metadata: Metadata = { title: "About", description: about.lead, alternates: { canonical: "/about" } };

/**
 * /about — about, now, timeline, toolbox (brief §4). Not in the design canvas: built from its
 * language (DESIGN_SPEC §7): the run report's breadcrumb and title, mono section headers,
 * hairlines, Geist + Instrument Serif. Content from content/about.json (drafted from the owner's repos; photo still to come).
 */
export default function About() {
  const live = site.availability.status === "available";
  return (
    <div className={`${home.section} ${styles.page}`} data-page="about">
      <div className={styles.crumbs}>
        <span>
          <Link href="/" className={`${styles.crumbLink} text-link`}>
            ← Home
          </Link>
          <span className={styles.muted}> / About</span>
        </span>
        <span className={styles.muted}>
          {site.city} · {site.timezone ?? "[timezone]"}
        </span>
      </div>

      <section aria-labelledby="about-title" className={styles.header}>
        <div className={styles.headText}>
          <div className={styles.meta}>
            <span>About</span>
            <span className={styles.status}>
              <span aria-hidden="true" className={live ? "led" : styles.ledOff} />
              {site.availability.label}
            </span>
          </div>
          <h1 id="about-title" className={styles.title}>
            {site.name} <em>at work.</em>
          </h1>
          <p className={styles.lead}>{about.lead}</p>
        </div>
        {/* no portrait yet: the box is left out rather than shown as a placeholder */}
        {about.photo && (
          <figure className={styles.photo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={about.photo} alt={about.photoAlt} />
          </figure>
        )}
      </section>

      <section aria-labelledby="bio-h" className={styles.block}>
        <SectionHeader index="01" title="Bio" id="bio-h" meta={`${about.bio.length} paragraphs`} />
        <div className={styles.bio}>
          {about.bio.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      <section aria-labelledby="now-h" className={styles.block}>
        <SectionHeader index="02" title="Now" id="now-h" meta={`Updated ${about.updated}`} />
        <ul className={styles.now}>
          {about.now.map((n, i) => (
            <li key={i}>
              <span aria-hidden="true" className={styles.nowMark} />
              {n}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="timeline-h" className={styles.block}>
        <SectionHeader index="03" title="Timeline" id="timeline-h" meta={`${about.timeline.length} entries`} />
        <ol className={styles.timeline}>
          {about.timeline.map((t, i) => (
            <li key={i} className={styles.tRow}>
              <span className={styles.tYear}>{t.year}</span>
              <span className={styles.tTitle}>{t.title}</span>
              <span className={styles.tNote}>{t.note}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="tools-h" className={styles.block}>
        <SectionHeader index="04" title="Toolbox" id="tools-h" meta={<Link href="/#toolbox" className="text-link">Where they ran →</Link>} />
        <dl className={styles.tools}>
          {toolbox.groups.map((g) => (
            <div key={g.category} className={styles.toolGroup}>
              <dt>{g.category}</dt>
              <dd>{g.tools.join(" · ")}</dd>
            </div>
          ))}
        </dl>
      </section>

    </div>
  );
}
