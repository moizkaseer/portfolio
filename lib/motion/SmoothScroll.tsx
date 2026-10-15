"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";
import { useReducedMotion } from "./reduced-motion";
import { readFreeze } from "@/lib/freeze";

let lenis: Lenis | null = null;

/** The active Lenis instance, or null (reduced motion, or not mounted yet). */
export function getLenis() {
  return lenis;
}

/** Scroll to an element or selector — through Lenis when it runs, natively otherwise. */
export function scrollToTarget(target: string | HTMLElement) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) });
  else el.scrollIntoView({ block: "start" });
}

/**
 * Lenis driven from GSAP's ticker (Tier A). Never instantiated when the visitor
 * prefers reduced motion, and not in ?freeze screenshots.
 */
export function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || readFreeze()) return;

    const instance = new Lenis({ anchors: { offset: -64 } });
    lenis = instance;
    instance.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      instance.destroy();
      lenis = null;
    };
  }, [reduced]);

  return null;
}
