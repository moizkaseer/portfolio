"use client";

import { useEffect, useRef, useState } from "react";
import { onScrollFrame } from "@/lib/motion/reveal";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { readFreeze } from "@/lib/freeze";
import styles from "@/components/rail/Rail.module.css";

interface Geo {
  w: number;
  h: number;
  d: string;
  ticks: { x: number; y: number; railX: number }[];
  size: number;
}

/**
 * C3 on the run report: the wire comes in from the screen edge into the system diagram's first
 * node, leaves the last node for the right margin and runs down to the "Next run" link, ticking
 * into each section header on the way. Phones: the rail on the right edge, 8px in. Drawn with
 * scroll, one packet; fully drawn and still with reduced motion.
 */
export function RunRail() {
  const ref = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);

  useEffect(() => {
    const root = ref.current?.parentElement;
    if (!root) return;
    const measure = () => {
      const rr = root.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      const railX = desktop ? vw - 40 * (Math.min(vw, 1920) / 1440) - rr.left : Math.min(vw, 560 + (vw - 560) / 2) - 8 - rr.left;
      const next = root.querySelector<HTMLElement>("[data-next-run]");
      if (!next) return;
      const yEnd = next.getBoundingClientRect().top - rr.top;
      const ticks = [...root.querySelectorAll<HTMLElement>("[data-rail-tick]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.right - rr.left, y: r.bottom - rr.top - 0.5, railX };
      });
      let d: string;
      const first = root.querySelector<HTMLElement>('[role="img"] [data-node]');
      const nodes = [...root.querySelectorAll<HTMLElement>('[role="img"] [data-node]')];
      if (desktop && first && nodes.length) {
        const fr = first.getBoundingClientRect();
        const last = nodes.filter((n) => n.style.gridRow === "1").sort((a, b) => a.getBoundingClientRect().right - b.getBoundingClientRect().right).pop()!;
        const lr = last.getBoundingClientRect();
        const y = fr.top + fr.height / 2 - rr.top;
        d = `M${-rr.left} ${y} H${fr.left - rr.left} M${lr.right - rr.left} ${y} H${railX} V${yEnd}`;
      } else {
        const crumbs = root.firstElementChild!.getBoundingClientRect();
        d = `M${railX} ${crumbs.bottom - rr.top} V${yEnd}`;
      }
      setGeo({ w: rr.width, h: rr.height, d, ticks: ticks.filter((t) => t.x < railX), size: desktop ? 10 : 8 });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    document.fonts?.ready.then(measure);
    measure();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!geo) return;
    const root = ref.current?.parentElement;
    const path = pathRef.current;
    if (!root || !path) return;
    if (prefersReducedMotion() || readFreeze()) {
      path.style.strokeDashoffset = "0";
      return;
    }
    const len = path.getTotalLength();
    return onScrollFrame(() => {
      const r = root.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - r.top) / r.height));
      path.style.strokeDashoffset = String(1 - p);
      const pk = packetRef.current;
      if (pk) {
        const pt = path.getPointAtLength(p * len);
        pk.style.opacity = p > 0 && p < 1 ? "1" : "0";
        pk.style.transform = `translate(${pt.x - geo.size / 2}px, ${pt.y - geo.size / 2}px)`;
      }
    });
  }, [geo]);

  return (
    <div ref={ref} className={styles.rail} aria-hidden="true" data-rail>
      {geo && (
        <>
          <svg width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} className={styles.svg}>
            <path className={styles.base} d={geo.d} />
            <path ref={pathRef} className={styles.progress} d={geo.d} pathLength={1} />
            {geo.ticks.map((t) => (
              <path key={t.y} className={styles.tick} data-lit="true" d={`M${t.x} ${t.y} H${t.railX}`} />
            ))}
          </svg>
          <span ref={packetRef} className={styles.packet} style={{ width: geo.size, height: geo.size }} />
        </>
      )}
    </div>
  );
}
