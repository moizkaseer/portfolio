"use client";

import { lazy, Suspense, useEffect, useState } from "react";

/**
 * Idle-loaded pieces with no server-rendered content: their code stays out of the initial load
 * and arrives once the page is idle (the C3 rail, the manifesto scrub, the footer wordmark scrub, the cursor dot,
 * the toolbox cross-link and copy-email).
 */
const PIECES = {
  rail: lazy(() => import("@/components/rail/Rail").then((m) => ({ default: m.Rail }))),
  manifesto: lazy(() => import("@/components/home/ManifestoMotion").then((m) => ({ default: m.ManifestoMotion }))),
  wordmark: lazy(() => import("@/components/footer/WordmarkScrub").then((m) => ({ default: m.WordmarkScrub }))),
  home: lazy(() => import("@/components/home/HomeEnhance").then((m) => ({ default: m.HomeEnhance }))),
  cursor: lazy(() => import("@/components/cursor/CursorDot").then((m) => ({ default: m.CursorDot }))),
};

/** `near`: also load as soon as the pointer or keyboard focus enters an element matching it. */
export function Deferred({ name, near }: { name: keyof typeof PIECES; near?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const ric = window.requestIdleCallback as typeof window.requestIdleCallback | undefined;
    const id = ric ? ric(() => setOn(true), { timeout: 1500 }) : window.setTimeout(() => setOn(true), 800);
    const enter = (e: Event) => (e.target as Element).closest?.(near!) && setOn(true);
    if (near) ["pointerover", "focusin"].forEach((t) => document.addEventListener(t, enter));
    return () => {
      if (ric) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
      if (near) ["pointerover", "focusin"].forEach((t) => document.removeEventListener(t, enter));
    };
  }, [near]);
  const Piece = PIECES[name];
  return on ? (
    <Suspense fallback={null}>
      <Piece />
    </Suspense>
  ) : null;
}
