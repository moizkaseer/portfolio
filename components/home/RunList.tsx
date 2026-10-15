"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { TraceNode } from "@/lib/graph/layout";
import { readFreeze } from "@/lib/freeze";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { MiniTrace } from "./MiniTrace";
import { MediaBox } from "./MediaBox";
import { GhostPointer } from "./GhostPointer";
import styles from "./SelectedRuns.module.css";

export interface RunItem {
  slug: string;
  runId: string;
  title: string;
  outcome: string;
  outcomeLong: string;
  stack: string[];
  status: "in-production" | "handed-over";
  since: string;
  year: string;
  trace: TraceNode[];
}

const noop = () => () => {};
/** ?freeze=home-hover: RUN #011 highlighted by the agent, trace mid-run (DESIGN_SPEC §9). */
function useFrozenHover() {
  return useSyncExternalStore(noop, () => readFreeze() === "home-hover", () => false);
}

function Status({ item, long }: { item: RunItem; long?: boolean }) {
  const live = item.status === "in-production";
  return (
    <span className={live ? styles.status : `${styles.status} ${styles.handedOver}`}>
      <span aria-hidden="true" className={live ? styles.led : styles.ledOff} />
      {live ? (long ? `In production since ${item.since}` : "In production") : "Handed over"}
    </span>
  );
}

export function RunList({ items, featured }: { items: RunItem[]; featured: string }) {
  const frozen = useFrozenHover();
  const [active, setActive] = useState<string | null>(null);
  const shown = frozen ? featured : active;
  const listRef = useRef<HTMLDivElement>(null);
  const tops = useRef(new Map<string, number>());
  const timer = useRef(0);
  // tools hovered in the Toolbox (07) highlight the runs that use them
  const [toolHighlight, setToolHighlight] = useState<string | null>(null);

  useEffect(() => {
    const on = (e: Event) => setToolHighlight((e as CustomEvent<string | null>).detail);
    window.addEventListener("toolbox:hover", on);
    return () => window.removeEventListener("toolbox:hover", on);
  }, []);

  const activate = (slug: string | null, delay = 0) => {
    window.clearTimeout(timer.current);
    const run = () => {
      // FLIP: remember where every row is before the layout changes
      listRef.current?.querySelectorAll<HTMLElement>("[data-run]").forEach((el) => tops.current.set(el.dataset.run!, el.getBoundingClientRect().top));
      setActive(slug);
    };
    if (delay) timer.current = window.setTimeout(run, delay);
    else run();
  };

  // FLIP: rows that moved slide from where they were (transform only, 0.5s expo.out)
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !tops.current.size || prefersReducedMotion()) return;
    list.querySelectorAll<HTMLElement>("[data-run]").forEach((el) => {
      const before = tops.current.get(el.dataset.run!);
      if (before === undefined) return;
      const dy = before - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1 || el.dataset.active === "true") return;
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.5s var(--ease-reveal)";
        el.style.transform = "";
      });
    });
    tops.current.clear();
  }, [active]);

  // the C3 rail branches into the active row's trace
  useEffect(() => {
    const el = shown ? listRef.current?.querySelector<HTMLElement>(`[data-run="${shown}"] [data-trace]`) : null;
    window.dispatchEvent(new CustomEvent("rail:branch", { detail: el ?? null }));
  }, [shown]);

  const ordered = [...items.filter((i) => i.slug === featured), ...items.filter((i) => i.slug !== featured)];

  return (
    <>
      {/* Desktop table */}
      <div className={styles.table} ref={listRef} onPointerLeave={() => activate(null, 120)}>
        <div aria-hidden="true" className={`${styles.cols} ${styles.colLabels}`}>
          <span>Run</span>
          <span>Project</span>
          <span>Outcome</span>
          <span>Stack</span>
          <span>Status</span>
          <span className={styles.right}>Year</span>
        </div>
        {items.map((item) => {
          const isActive = shown === item.slug;
          const dim = toolHighlight !== null && !item.stack.includes(toolHighlight);
          const lit = toolHighlight !== null && item.stack.includes(toolHighlight);
          return (
            <Link
              key={item.slug}
              href={`/work/${item.slug}`}
              prefetch={false}
              data-run={item.slug}
              data-active={isActive}
              data-tool-dim={dim}
              data-tool-lit={lit}
              className={isActive ? styles.rowActive : `${styles.cols} ${styles.row}`}
              onPointerEnter={() => activate(item.slug, 120)}
              onFocus={() => activate(item.slug)}
            >
              {isActive ? (
                <>
                  <span className={styles.activeId}>RUN #{item.runId}</span>
                  <div className={styles.activeBody}>
                    <span className={styles.activeName}>
                      <span aria-hidden="true" className={styles.nameMark} />
                      {item.title}
                    </span>
                    <span className={styles.activeOutcome}>{item.outcomeLong}</span>
                    <MiniTrace nodes={item.trace} play={!frozen} frozenAt={frozen ? 2 : undefined} />
                    <div className={styles.activeMeta}>
                      <span>{item.stack.join(" · ")}</span>
                      <Status item={item} long />
                      <span className={styles.ink}>
                        Open run report <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </div>
                  <MediaBox reveal={!frozen} />
                  {frozen && <GhostPointer label="agent · highlight_project" style={{ left: "47%", top: 52 }} />}
                </>
              ) : (
                <>
                  <span className={styles.id}>RUN #{item.runId}</span>
                  <span className={styles.name}>{item.title}</span>
                  <span className={styles.outcome}>{item.outcome}</span>
                  <span className={styles.stack}>{item.stack.join(" · ")}</span>
                  <Status item={item} />
                  <span className={`${styles.year} ${styles.right}`}>{item.year}</span>
                </>
              )}
            </Link>
          );
        })}
      </div>

      {/* Phone cards (Mobile.html): the featured run first with its media and trace. */}
      <div className={styles.cards}>
        {ordered.map((item, i) => (
          <Link key={item.slug} href={`/work/${item.slug}`} prefetch={false} className={i === 0 ? styles.cardFeatured : styles.card} data-card={item.slug}>
            {i === 0 && <MediaBox compact />}
            <span className={styles.cardMeta}>
              <span className={styles.muted}>RUN #{item.runId}</span>
              <Status item={item} />
            </span>
            <span className={i === 0 ? styles.cardTitleFeatured : styles.cardTitle}>{item.title}</span>
            {i === 0 && (
              <>
                <span className={styles.outcome}>{item.outcome}</span>
                <MiniTrace nodes={item.trace} compact play playWhenCentred frozenAt={frozen ? 2 : undefined} />
              </>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
