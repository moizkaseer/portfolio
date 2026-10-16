"use client";

import { useEffect, useRef } from "react";
import styles from "./CursorDot.module.css";

const TARGETS = "a[href], button:not(:disabled), [role='button'], [role='option'], label[for], summary";
// interactive areas with their own pointer behaviour: the hero stage and the agent's panel
const EXCLUDE = "[data-hero-stage], [data-agent-panel-el], [data-no-magnet]";
// large targets (whole run rows / cards) get the dot but don't move
const NO_PULL = "[data-run], [data-work-row], [data-work-card], [data-card], input, textarea, select";
const LERP = 0.18; // per 60Hz frame (brief §3), scaled by elapsed time so 120Hz screens trail the same
const MAX_PULL = 6;
const PULL = 0.18;

/**
 * Brief §3 "Cursor & micro-interactions": the native cursor stays; over interactive elements a
 * small --signal dot trails the pointer, and links / buttons lean up to 6px towards it.
 * Idle-loaded (components/Deferred). Off on touch / coarse pointers and with reduced motion.
 */
export function CursorDot() {
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cleanup: (() => void) | undefined;

    const start = () => {
      cleanup?.();
      cleanup = undefined;
      if (!fine.matches || reduce.matches || !dot.current) return;
      const el = dot.current;
      let x = 0;
      let y = 0;
      let tx = 0;
      let ty = 0;
      let raf = 0;
      let last = 0;
      let over: HTMLElement | null = null;
      let pull = false;
      let px = 0;
      let py = 0;

      const release = () => {
        if (!over) return;
        if (pull && (px || py)) {
          const back = over;
          back.animate([{ translate: `${px}px ${py}px` }, { translate: "0px 0px" }], { duration: 250, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)" });
        }
        over.style.translate = "";
        over = null;
        pull = false;
        px = py = 0;
        el.dataset.on = "false";
      };

      const tick = (now: number) => {
        const dt = last ? Math.min(now - last, 100) : 16.7;
        last = now;
        const a = 1 - Math.pow(1 - LERP, dt / 16.7);
        x += (tx - x) * a;
        y += (ty - y) * a;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.1 ? requestAnimationFrame(tick) : 0;
        if (!raf) last = 0;
      };

      const move = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        tx = e.clientX;
        ty = e.clientY;
        const hit = (e.target as Element | null)?.closest?.<HTMLElement>(TARGETS) ?? null;
        const target = hit && !hit.closest(EXCLUDE) ? hit : null;
        if (target !== over) {
          release();
          if (target) {
            over = target;
            pull = !target.matches(NO_PULL);
            if (el.dataset.on !== "true") {
              x = tx; // appear at the pointer, then trail it
              y = ty;
            }
            el.dataset.on = "true";
          }
        }
        if (over && pull) {
          // distance from the element's resting centre (its rect minus the current pull)
          const r = over.getBoundingClientRect();
          const clamp = (v: number) => Math.round(Math.max(-MAX_PULL, Math.min(MAX_PULL, v)) * 10) / 10;
          px = clamp((tx - (r.left - px + r.width / 2)) * PULL);
          py = clamp((ty - (r.top - py + r.height / 2)) * PULL);
          over.style.translate = `${px}px ${py}px`;
        }
        if (!raf) raf = requestAnimationFrame(tick);
      };
      const leave = () => release();

      document.addEventListener("pointermove", move, { passive: true });
      document.documentElement.addEventListener("pointerleave", leave);
      window.addEventListener("blur", leave);
      cleanup = () => {
        release();
        cancelAnimationFrame(raf);
        document.removeEventListener("pointermove", move);
        document.documentElement.removeEventListener("pointerleave", leave);
        window.removeEventListener("blur", leave);
      };
    };

    start();
    fine.addEventListener("change", start);
    reduce.addEventListener("change", start);
    return () => {
      cleanup?.();
      fine.removeEventListener("change", start);
      reduce.removeEventListener("change", start);
    };
  }, []);

  return <div ref={dot} aria-hidden="true" className={styles.dot} data-cursor-dot data-on="false" />;
}
