import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Children, isValidElement, type ReactNode } from "react";
import { getNextProject, getProject, getProjects } from "@/lib/content/projects";
import { diagramLayout } from "@/lib/graph/diagram-layout";
import { renderMdx } from "@/lib/content/mdx";
import { SectionHeader } from "@/components/home/SectionHeader";
import { SystemDiagram } from "@/components/graph/SystemDiagram";
import { ReplayProvider } from "@/components/run/ReplayContext";
import { TraceReplay } from "@/components/run/TraceReplay";
import { RunTitle } from "@/components/run/RunTitle";
import { isLive, statusLabel } from "@/lib/content/status";
import { RunRail } from "@/components/run/RunRail";
import { site } from "@/lib/content/site";
import { abs, siteUrl } from "@/lib/seo";
import home from "@/components/home/home.module.css";
import styles from "./run.module.css";

// Every run report is prerendered (generateStaticParams), so a navigation only fetches its
// static payload — which run links prefetch in full (prefetch={true}). A Suspense fallback
// here would also stop the title from morphing, so this segment opts out of the dev-only
// "instant navigation" validation instead.
export const instant = false;

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const p = getProject((await params).slug);
  return p ? { title: `RUN #${p.runId} ${p.title}`, description: p.outcome, alternates: { canonical: `/work/${p.slug}` } } : {};
}

/** "with a *real number.*" → the starred phrase in serif italic (RunReport.html lead). */
function Lead({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/).map((part, i) =>
        part.startsWith("*") ? <em key={i}>{part.slice(1, -1)}</em> : part,
      )}
    </>
  );
}

const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((c) => (typeof c === "string" ? c : isValidElement<{ children?: ReactNode }>(c) ? textOf(c.props.children) : ""))
    .join("");

/** /work/[slug] — the Run Report (RunReport.html, brief §6). */
export default async function RunReport({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) notFound();
  const next = getNextProject(slug);
  const layout = diagramLayout(p.graph);
  const live = isLive(p.status);

  // brief §6 sections the design doesn't show (problem, decisions, what's next) come from the
  // MDX body, numbered after the design's three
  const headings = [...p.body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  const first = p.trace ? 4 : 3;
  const body = await renderMdx(p.body, {
    h2: ({ children }) => {
      const title = textOf(children);
      const n = first + Math.max(0, headings.indexOf(title));
      return (
        <div className={styles.bodyHead}>
          <SectionHeader index={String(n).padStart(2, "0")} title={title} id={`s-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`} />
        </div>
      );
    },
    p: ({ children }) => <p className={styles.bodyText}>{children}</p>,
    ul: ({ children }) => <ul className={styles.bodyList}>{children}</ul>,
    a: ({ href, children }) => (
      <a href={href} className="text-link">
        {children}
      </a>
    ),
  });

  return (
    <div className={`${home.section} ${styles.page}`} data-rail-root data-page="work">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: p.title,
            headline: p.title,
            description: p.outcome,
            url: abs(`/work/${p.slug}`),
            genre: p.category,
            keywords: p.stack.join(", "),
            creator: { "@type": "Person", name: site.name, url: siteUrl() },
            ...(/^\d{4}$/.test(p.year) ? { dateCreated: p.year } : {}),
          }).replace(/</g, "\\u003c"),
        }}
      />
      <div className={styles.crumbs}>
        <span>
          <Link href="/work" className={`${styles.crumbLink} text-link`}>
            ← All runs
          </Link>
          <span className={styles.muted}> / RUN #{p.runId}</span>
        </span>
        <Link href={`/work/${next.slug}`} prefetch className={`${styles.muted} text-link`}>
          Next · RUN #{next.runId} →
        </Link>
      </div>

      <section aria-labelledby="run-title" className={styles.header}>
        <div className={styles.meta}>
          <span>RUN #{p.runId}</span>
          <span className={styles.status}>
            <span aria-hidden="true" className={live ? `${styles.led} pulse` : styles.ledOff} />
            {statusLabel(p.status, p.since)}
          </span>
          <span className={styles.muted}>{p.runsLine}</span>
        </div>
        <h1 id="run-title" className={styles.title}>
          <RunTitle slug={p.slug}>{p.title}</RunTitle>
        </h1>
        <p className={styles.lead}>
          <Lead text={p.lead} />
        </p>
        <dl className={styles.facts}>
          {[
            ["Client", p.industry],
            ["Role", p.role],
            ["Timeline", p.timeline],
            ["Stack", p.stack.join(" · ")],
          ].map(([k, v]) => (
            <div key={k} className={styles.fact}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          <div className={styles.fact}>
            <dt>Status</dt>
            <dd className={styles.status}>
              <span aria-hidden="true" className={live ? styles.ledPlain : styles.ledOff} />
              {statusLabel(p.status)}
            </dd>
          </div>
        </dl>
      </section>

      {p.trace ? (
        <ReplayProvider trace={p.trace}>
          <SystemSection layout={layout} placeholder={p.placeholder} />
          <section aria-labelledby="trace-h" className={styles.block}>
            <SectionHeader index="02" title="Trace replay" id="trace-h" meta="Sample run · sanitized" />
            <TraceReplay />
          </section>
        </ReplayProvider>
      ) : (
        <SystemSection layout={layout} placeholder={p.placeholder} />
      )}

      <section aria-labelledby="results-h" className={styles.block}>
        <SectionHeader index={p.trace ? "03" : "02"} title="Results" id="results-h" meta={`Measured over ${p.resultsPeriod}`} />
        <div className={styles.results}>
          {p.results.map((r) => (
            <div key={r.label} className={styles.result}>
              <span className={styles.number}>
                {r.value}
                <span className={styles.unit}>{r.unit}</span>
              </span>
              <span className={styles.resultLabel}>{r.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.body}>{body}</div>

      <Link href={`/work/${next.slug}`} prefetch className={styles.next} data-next-run>
        <span className={styles.nextText}>
          <span className={styles.nextLabel}>Next run · RUN #{next.runId}</span>
          <span className={styles.nextTitle}>
            <RunTitle slug={next.slug}>{next.title}</RunTitle>
          </span>
        </span>
        <span aria-hidden="true" className={styles.nextArrow}>
          →
        </span>
      </Link>
      <RunRail />
    </div>
  );
}

function SystemSection({ layout, placeholder }: { layout: ReturnType<typeof diagramLayout>; placeholder: boolean }) {
  return (
    <section aria-labelledby="system-h" className={styles.block}>
      <SectionHeader index="01" title="The system" id="system-h" meta={`${layout.nodes.length} nodes · ${layout.edgeCount} edges`} />
      <SystemDiagram layout={layout} />
      {placeholder && (
        <p className={styles.note}>
          [This project&apos;s real steps go here. Claude Code draws this diagram from the project&apos;s graph.json — the same data that
          reshapes the home-page graph.]
        </p>
      )}
    </section>
  );
}
