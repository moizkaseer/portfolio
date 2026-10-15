"use client";

import { prefersReducedMotion } from "./reduced-motion";
import { readFreeze } from "@/lib/freeze";

/**
 * Line reveal (brief §3): SplitText by lines, masked, translate-y 100% → 0, stagger 0.06s,
 * expo.out — when the element enters the viewport. Reduced motion (Tier B): a 200ms fade.
 * GSAP + SplitText load only when the element gets close. Elements already on screen when
 * this runs are left as they are (no flash of hidden text).
 */
export function revealLinesOnEnter(el: HTMLElement): () => void {
  if (readFreeze()) return () => {};
  let cleanup = () => {};
  const near = new IntersectionObserver(
    async ([entry]) => {
      if (!entry.isIntersecting) return;
      near.disconnect();
      const alreadyVisible = el.getBoundingClientRect().top < window.innerHeight * 0.92;
      if (alreadyVisible) return;
      if (prefersReducedMotion()) {
        el.style.opacity = "0";
        const io = new IntersectionObserver(([e]) => {
          if (!e.isIntersecting) return;
          io.disconnect();
          el.style.transition = "opacity 0.2s linear";
          el.style.opacity = "1";
        }, { rootMargin: "0px 0px -12% 0px" });
        io.observe(el);
        cleanup = () => io.disconnect();
        return;
      }
      const [{ gsap }, { SplitText }] = await Promise.all([import("./gsap"), import("gsap/SplitText")]);
      gsap.registerPlugin(SplitText);
      const split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "reveal-line" });
      gsap.set(split.lines, { yPercent: 100 });
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        gsap.to(split.lines, {
          yPercent: 0,
          duration: 0.9,
          stagger: 0.06,
          ease: "expo.out",
          onComplete: () => split.revert(),
        });
      }, { rootMargin: "0px 0px -12% 0px" });
      io.observe(el);
      cleanup = () => {
        io.disconnect();
        split.revert();
      };
    },
    { rootMargin: "50% 0px" },
  );
  near.observe(el);
  return () => {
    near.disconnect();
    cleanup();
  };
}

/** Calls fn on every animation frame while the page scrolls (and once at start). Returns a stop function. */
export function onScrollFrame(fn: () => void): () => void {
  let raf = 0;
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      fn();
    });
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  schedule();
  return () => {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    cancelAnimationFrame(raf);
  };
}
