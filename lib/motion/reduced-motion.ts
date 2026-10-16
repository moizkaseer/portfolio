"use client";

import { useSyncExternalStore } from "react";

/**
 * Reduced-motion tiers (brief §3):
 *  Tier A — decorative (smooth scroll, parallax, graph physics): removed.
 *  Tier B — reveals: become a 200ms opacity fade.
 *  Tier C — state feedback: kept.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
