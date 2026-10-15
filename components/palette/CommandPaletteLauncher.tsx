"use client";

import { lazy, Suspense, useEffect, useState } from "react";

// The palette itself loads on first use, never in the initial bundle (brief §9).
const CommandPalette = lazy(() => import("./CommandPalette"));
// the Shift+G grid overlay (dev aid + easter egg) also loads on first use
const GridOverlay = lazy(() => import("@/components/grid/GridOverlay"));

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/** ⌘K / Ctrl+K / "/" opens the command palette. */
export function CommandPaletteLauncher({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [grid, setGrid] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.code === "KeyG" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        setGrid((g) => !g);
        return;
      }
      const combo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const slash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target);
      if (!combo && !slash) return;
      e.preventDefault();
      setLoaded(true);
      setOpen((v) => (combo ? !v : true));
    };
    const onOpen = () => {
      setLoaded(true);
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("palette:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("palette:open", onOpen);
    };
  }, []);

  return (
    <Suspense fallback={null}>
      {loaded && <CommandPalette open={open} onClose={() => setOpen(false)} email={email} />}
      {grid && <GridOverlay />}
    </Suspense>
  );
}
