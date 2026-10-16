"use client";

import { useEffect, useRef } from "react";
import { useReplay } from "./ReplayContext";
import styles from "./TraceReplay.module.css";

/** "02 — Trace replay" (RunReport.html): replays a run step by step with its real timings. */
export function TraceReplay() {
  const r = useReplay();
  const termRef = useRef<HTMLDivElement>(null);
  const observe = r?.observe;
  useEffect(() => {
    const cleanup = observe?.(termRef.current);
    return typeof cleanup === "function" ? cleanup : undefined;
  }, [observe]);
  if (!r) return null;
  const { trace, index, elapsed, finished, playing } = r;
  const n = trace.rows.length;
  const pct = Math.min(100, (elapsed / trace.durationMs) * 100);
  const status = finished ? `Complete · ${n} / ${n}` : `Replaying · ${index + 1} / ${n}`;

  return (
    <div className={styles.cols}>
      <div className={styles.left}>
        <p className={styles.title}>
          Every run is logged. <em>Replay one.</em>
        </p>
        <p className={styles.text}>{trace.note}</p>
        <div className={styles.buttons}>
          <button type="button" className={styles.replay} onClick={() => r.replay()}>
            <span aria-hidden="true" className={styles.triangle} />
            {playing ? "Replaying" : "Replay"}
          </button>
          <button type="button" className={styles.speed} onClick={() => r.cycleSpeed()} aria-label={`Replay speed ${r.speed}×, change speed`}>
            Speed {r.speed}×
          </button>
        </div>
      </div>

      <div className={styles.term} ref={termRef} data-trace-terminal>
        <div className={styles.head}>
          <span>
            {trace.runId} · {trace.date}
          </span>
          <span className={styles.status} data-status>
            <span aria-hidden="true" className={styles.sq} />
            {status}
          </span>
        </div>
        <ol className={styles.rows} aria-label={`Run ${trace.runId}, ${n} steps`}>
          {trace.rows.map((row, i) => {
            const state = i < index || (finished && i <= index) ? "past" : i === index ? "current" : "future";
            return (
              <li key={i} className={styles.row} data-state={state}>
                <span className={styles.time}>{state === "future" ? "—" : (row.t ?? "—")}</span>
                <span>{row.step}</span>
                <span>
                  {row.text}
                  {state === "current" && <span aria-hidden="true" className={styles.cursor} />}
                </span>
              </li>
            );
          })}
        </ol>
        <div className={styles.foot}>
          <span className={styles.bar} aria-hidden="true">
            <span className={styles.fill} style={{ width: `${pct}%` }} />
            <span className={styles.dot} style={{ left: `calc(${pct}% - 3px)` }} />
          </span>
          <span data-elapsed>{(elapsed / 1000).toFixed(2)}s</span>
        </div>
      </div>
    </div>
  );
}
