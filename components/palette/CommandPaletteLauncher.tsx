"use client";

import { lazy, Suspense, useEffect, useState } from "react";

// The palette itself loads on first use, never in the initial bundle (brief §9).
const CommandPalette = lazy(() => import("./CommandPalette"));

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/** ⌘K / Ctrl+K / "/" opens the command palette. */
export function CommandPaletteLauncher({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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

  if (!loaded) return null;
  return (
    <Suspense fallback={null}>
      <CommandPalette open={open} onClose={() => setOpen(false)} email={email} />
    </Suspense>
  );
}
