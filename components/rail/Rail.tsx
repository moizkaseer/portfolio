"use client";

import { useEffect, useRef, useState } from "react";
import { onScrollFrame } from "@/lib/motion/reveal";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { readFreeze } from "@/lib/freeze";
import styles from "./Rail.module.css";

interface Geometry {
  w: number;
  h: number;
  x: number;
  y0: number;
  y1: number;
  ticks: { y: number; x: number }[];
  packet: number;
}

const DESKTOP = { railX: 1400, railY: 1300, stageW: 1440, packet: 10 };
const PHONE = { railX: 382, railY: 1283, stageW: 390, packet: 8 };

/**
 * C3 — one continuous wire. Below the prompt the rail continues down the right margin
 * (phones: 8px from the right edge), draws itself as the visitor scrolls, ticks into every
 * section header and carries one packet marking where they are. When a run is open, it
 * branches into that row. One SVG, a handful of paths, positions measured from the real
 * anchors and recomputed on resize. Reduced motion: fully drawn, no packet.
 */
export function Rail() {
  const ref = useRef<HTMLDivElement>(null);
  const progressRef = useRef<SVGPathElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [branch, setBranch] = useState<{ y: number; x: number } | null>(null);
  /** how many ticks the drawn rail has reached (React only re-renders when this changes) */
  const [litTicks, setLitTicks] = useState(Number.POSITIVE_INFINITY);

  // geometry from the anchors
  useEffect(() => {
    const root = ref.current?.parentElement;
    if (!root) return;
    let branchEl: HTMLElement | null = null;
    const measure = () => {
      const stage = root.querySelector<HTMLElement>("[data-hero-stage]");
      if (!stage) return;
      const rr = root.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      const d = window.matchMedia("(min-width: 1024px)").matches ? DESKTOP : PHONE;
      const s = sr.width / d.stageW;
      const x = sr.left - rr.left + d.railX * s;
      const y0 = sr.top - rr.top + d.railY * s;
      const end = root.querySelector<HTMLElement>("[data-rail-end]");
      const y1 = end ? end.getBoundingClientRect().bottom - rr.top - 48 : rr.height;
      const ticks = [...root.querySelectorAll<HTMLElement>("[data-rail-tick]")]
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { y: r.bottom - rr.top - 0.5, x: r.right - rr.left };
        })
        .filter((t) => t.y > y0 && t.y < y1);
      setGeo({ w: rr.width, h: rr.height, x, y0, y1, ticks, packet: d.packet });
      if (branchEl) {
        const row = branchEl.closest<HTMLElement>("[data-run]") ?? branchEl;
        const br = branchEl.getBoundingClientRect();
        setBranch({ y: br.top + br.height / 2 - rr.top, x: row.getBoundingClientRect().right - rr.left });
      } else setBranch(null);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    const onBranch = (e: Event) => {
      branchEl = (e as CustomEvent<HTMLElement | null>).detail;
      requestAnimationFrame(measure);
    };
    window.addEventListener("rail:branch", onBranch);
    document.fonts?.ready.then(measure);
    measure();
    return () => {
      ro.disconnect();
      window.removeEventListener("rail:branch", onBranch);
    };
  }, []);

  // drawing + packet, tied to scroll
  useEffect(() => {
    if (!geo) return;
    const root = ref.current?.parentElement;
    if (!root || prefersReducedMotion() || readFreeze()) {
      progressRef.current?.style.setProperty("stroke-dashoffset", "0");
      return;
    }
    return onScrollFrame(() => {
      const top = root.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - (top + geo.y0)) / (geo.y1 - geo.y0)));
      progressRef.current?.style.setProperty("stroke-dashoffset", String(1 - p));
      const pk = packetRef.current;
      if (pk) {
        pk.style.opacity = p > 0 && p < 1 ? "1" : "0";
        pk.style.transform = `translate(${geo.x - geo.packet / 2}px, ${geo.y0 + p * (geo.y1 - geo.y0) - geo.packet / 2}px)`;
      }
      const drawnY = geo.y0 + p * (geo.y1 - geo.y0);
      setLitTicks(geo.ticks.filter((t) => t.y <= drawnY).length);
    });
  }, [geo]);

  return (
    <div ref={ref} className={styles.rail} aria-hidden="true" data-rail>
      {geo && (
        <>
          <svg width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} className={styles.svg}>
            <path className={styles.base} d={`M${geo.x} ${geo.y0} V${geo.y1}`} />
            <path ref={progressRef} className={styles.progress} d={`M${geo.x} ${geo.y0} V${geo.y1}`} pathLength={1} />
            {geo.ticks.map((t, i) => (
              <path key={t.y} className={styles.tick} data-lit={i < litTicks} d={`M${t.x} ${t.y} H${geo.x}`} />
            ))}
            {branch && <path className={styles.branch} d={`M${geo.x} ${branch.y} H${branch.x}`} />}
          </svg>
          <span ref={packetRef} className={styles.packet} style={{ width: geo.packet, height: geo.packet }} />
        </>
      )}
    </div>
  );
}
