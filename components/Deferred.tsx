"use client";

import { lazy, Suspense, useEffect, useState } from "react";

/**
 * Idle-loaded pieces with no server-rendered content: their code stays out of the initial load
 * and arrives once the page is idle (the C3 rail, the manifesto scrub, the footer wordmark scrub).
 */
const PIECES = {
  rail: lazy(() => import("@/components/rail/Rail").then((m) => ({ default: m.Rail }))),
  manifesto: lazy(() => import("@/components/home/ManifestoMotion").then((m) => ({ default: m.ManifestoMotion }))),
  wordmark: lazy(() => import("@/components/footer/WordmarkScrub").then((m) => ({ default: m.WordmarkScrub }))),
};

export function Deferred({ name }: { name: keyof typeof PIECES }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const ric = window.requestIdleCallback as typeof window.requestIdleCallback | undefined;
    const id = ric ? ric(() => setOn(true), { timeout: 1500 }) : window.setTimeout(() => setOn(true), 800);
    return () => (ric ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, []);
  const Piece = PIECES[name];
  return on ? (
    <Suspense fallback={null}>
      <Piece />
    </Suspense>
  ) : null;
}
