"use client";

import { useEffect, useRef, useState } from "react";
import type { TraceNode } from "@/lib/graph/layout";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import styles from "./MiniTrace.module.css";

const STEP_MS = 480; // same rhythm as the prompt's test run

/**
 * A project's main path as a one-line trace (Main.html / Mobile.html). At rest it shows the
 * design's mid-run state; when played it runs once, step by step, and ends with the last node.
 */
export function MiniTrace({
  nodes,
  compact = false,
  play = false,
  playWhenCentred = false,
  frozenAt,
}: {
  nodes: TraceNode[];
  compact?: boolean;
  play?: boolean;
  playWhenCentred?: boolean;
  frozenAt?: number;
}) {
  const rest = Math.max(0, nodes.length - 2);
  const [current, setCurrent] = useState(frozenAt ?? rest);
  const [moving, setMoving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (frozenAt !== undefined || !play) return;
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      if (prefersReducedMotion()) {
        setCurrent(nodes.length - 1);
        return;
      }
      let k = 0;
      setMoving(false);
      setCurrent(0);
      const next = () => {
        k += 1;
        if (k >= nodes.length) return;
        setMoving(true);
        setCurrent(k);
        timer = window.setTimeout(next, STEP_MS);
      };
      timer = window.setTimeout(next, STEP_MS);
    };
    if (!playWhenCentred) {
      run();
      return () => window.clearTimeout(timer);
    }
    const io = new IntersectionObserver(([e]) => e.isIntersecting && run(), { rootMargin: "-40% 0px -40% 0px" });
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [play, playWhenCentred, frozenAt, nodes.length]);

  return (
    <div ref={ref} aria-hidden="true" className={compact ? `${styles.trace} ${styles.compact}` : styles.trace} data-trace data-current={current}>
      {nodes.map((n, i) => {
        const state = i < current ? "done" : i === current ? "current" : "pending";
        return (
          <span key={n.id} className={styles.step}>
            {i > 0 && (
              <span className={styles.conn} data-lit={i <= current}>
                {i === current && current > 0 && (
                  <span key={`p${current}`} className={styles.packet} data-moving={moving && frozenAt === undefined} />
                )}
              </span>
            )}
            <span className={styles.node} data-state={state} data-last={i === nodes.length - 1}>
              <span className={styles.mark} />
              {compact ? n.short : n.id.replace(/-/g, " ")}
            </span>
          </span>
        );
      })}
    </div>
  );
}
