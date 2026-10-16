"use client";

import { useEffect } from "react";
import { useReducedMotion } from "./reduced-motion";
import { readFreeze } from "@/lib/freeze";

/**
 * Smooth scrolling (Tier A). Never created under reduced motion or in ?freeze
 * screenshots, and loaded after the page is idle so GSAP + Lenis stay out of the
 * initial bundle (brief §9).
 */
export function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || readFreeze()) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    const start = () =>
      import("./lenis-setup").then((m) => {
        if (!cancelled) stop = m.startSmoothScroll();
      });
    // Safari has no requestIdleCallback
    const ric = window.requestIdleCallback as typeof window.requestIdleCallback | undefined;
    const id = ric ? ric(start, { timeout: 2000 }) : window.setTimeout(start, 1200);
    return () => {
      cancelled = true;
      if (ric) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
      stop?.();
    };
  }, [reduced]);

  return null;
}
