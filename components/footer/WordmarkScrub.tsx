"use client";

import { useEffect } from "react";
import { onScrollFrame } from "@/lib/motion/reveal";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { readFreeze } from "@/lib/freeze";

/** The footer wordmark rises into view with a slow scrub as you reach the bottom (brief §5). */
export function WordmarkScrub() {
  useEffect(() => {
    const box = document.querySelector<HTMLElement>("[data-wordmark]");
    const inner = box?.firstElementChild as HTMLElement | null;
    if (!box || !inner || prefersReducedMotion() || readFreeze()) return;
    return onScrollFrame(() => {
      const r = box.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (r.height + vh * 0.25)));
      inner.style.transform = `translate3d(0, ${((1 - p) * 100).toFixed(2)}%, 0)`;
    });
  }, []);
  return null;
}
