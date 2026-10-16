"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { onScrollFrame } from "@/lib/motion/reveal";
import { readFreeze } from "@/lib/freeze";
import styles from "./Process.module.css";

interface Step {
  id: string;
  title: string;
  text: string;
  log: string[];
}

/** The pinned desktop version: the diagram builds step by step with scroll (≤ 2.5 viewport heights). */
export function ProcessPinned({ steps, kinds }: { steps: Step[]; kinds: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [frozenView, setFrozenView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const f = readFreeze();
    const frozen = f?.match(/^process-(\d)$/);
    if (f) {
      requestAnimationFrame(() => {
        setFrozenView(true);
        if (frozen) setStep(Number(frozen[1]));
      });
      return;
    }
    return onScrollFrame(() => {
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      setStep(Math.min(steps.length - 1, Math.floor(p * steps.length)));
    });
  }, [steps.length]);

  const current = steps[step];
  const logRows = steps.slice(0, step + 1).flatMap((s) =>
    s.log.map((l) => {
      const [head, ...rest] = l.split(" · ");
      return rest.length ? { step: head, text: rest.join(" · ") } : { step: s.id, text: l };
    }),
  );

  return (
    <div ref={ref} className={styles.pin} data-process-pin data-static={frozenView} aria-hidden="true">
      <div className={styles.sticky}>
        <div className={styles.diagram} data-step={step}>
          {steps.map((s, i) => (
            <Fragment key={s.id}>
              {i > 0 && <span className={styles.conn} data-drawn={i <= step} />}
              <div className={styles.box} data-shown={i <= step} data-active={i === step} data-ghost={i > step || undefined}>
                <span className={styles.itemTop}>
                  <span className={styles.kind}>
                    <span className={styles.mark} data-kind={kinds[i]} data-active={i === step} />
                    {kinds[i]}
                  </span>
                  <span>0{i + 1}</span>
                </span>
                <span className={styles.boxTitle}>{s.title}</span>
              </div>
            </Fragment>
          ))}
        </div>

        <div className={styles.copy}>
          <span className={styles.counter}>
            Step {step + 1} / {steps.length}
          </span>
          <h3 key={current.id} className={styles.title}>
            {current.title}
          </h3>
          <p key={`${current.id}-t`} className={styles.text}>
            {current.text}
          </p>
        </div>

        <div className={styles.log}>
          <div className={styles.logHead}>
            <span className={styles.logTitle}>
              <span className={styles.sq} />
              Run log
            </span>
            <span>{current.id}</span>
          </div>
          <div className={styles.logBody}>
            {logRows.map((r, i) => (
              <div key={`${r.step}-${i}`} className={styles.logRow} data-new={i >= logRows.length - current.log.length}>
                <span>{r.step}</span>
                <span>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
