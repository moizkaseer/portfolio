"use client";

import Link from "next/link";
import { useState } from "react";
import { RunTitle } from "@/components/run/RunTitle";
import runs from "@/components/home/SelectedRuns.module.css";
import styles from "./WorkIndex.module.css";

export interface WorkItem {
  slug: string;
  runId: string;
  title: string;
  outcome: string;
  stack: string[];
  status: "in-production" | "handed-over";
  year: string;
  category: "Agents" | "Automations" | "Tools" | "Experiments";
}

const CATEGORIES = ["Agents", "Automations", "Tools", "Experiments"] as const;

export function WorkIndex({ items }: { items: WorkItem[] }) {
  const [filter, setFilter] = useState<WorkItem["category"] | null>(null);
  const shown = filter ? items.filter((i) => i.category === filter) : items;
  const count = (c: WorkItem["category"] | null) => String(c ? items.filter((i) => i.category === c).length : items.length).padStart(2, "0");

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filter runs">
        <span className={styles.filterLabel}>Filter</span>
        {[null, ...CATEGORIES].map((c) => {
          const n = count(c);
          return (
            <button
              key={c ?? "all"}
              type="button"
              className={styles.chip}
              aria-pressed={filter === c}
              disabled={n === "00"}
              onClick={() => setFilter(c)}
            >
              {c ?? "All"} <span className={styles.count}>{n}</span>
            </button>
          );
        })}
      </div>
      <p className={styles.live} role="status" aria-live="polite">
        {filter ? `${shown.length} ${filter.toLowerCase()} shown` : ""}
      </p>

      <div className={runs.table}>
        <div aria-hidden="true" className={`${runs.cols} ${runs.colLabels}`}>
          <span>Run</span>
          <span>Project</span>
          <span>Outcome</span>
          <span>Stack</span>
          <span>Status</span>
          <span className={runs.right}>Year</span>
        </div>
        {shown.map((item) => (
          <Link key={item.slug} href={`/work/${item.slug}`} prefetch className={`${runs.cols} ${runs.row}`} data-work-row={item.slug}>
            <span className={runs.id}>RUN #{item.runId}</span>
            <span className={runs.name}>
              <RunTitle slug={item.slug} layout="rows">{item.title}</RunTitle>
            </span>
            <span className={runs.outcome}>{item.outcome}</span>
            <span className={runs.stack}>{item.stack.join(" · ")}</span>
            <Status item={item} />
            <span className={`${runs.year} ${runs.right}`}>{item.year}</span>
          </Link>
        ))}
      </div>

      <div className={runs.cards}>
        {shown.map((item) => (
          <Link key={item.slug} href={`/work/${item.slug}`} prefetch className={runs.card} data-work-card={item.slug}>
            <span className={runs.cardMeta}>
              <span className={runs.muted}>RUN #{item.runId}</span>
              <Status item={item} />
            </span>
            <span className={runs.cardTitle}>
              <RunTitle slug={item.slug} layout="cards">{item.title}</RunTitle>
            </span>
            <span className={runs.outcome}>{item.outcome}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

function Status({ item }: { item: WorkItem }) {
  const live = item.status === "in-production";
  return (
    <span className={live ? runs.status : `${runs.status} ${runs.handedOver}`}>
      <span aria-hidden="true" className={live ? `${runs.led} pulse` : runs.ledOff} />
      {live ? "In production" : "Handed over"}
    </span>
  );
}
