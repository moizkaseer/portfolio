"use client";

import { useEffect } from "react";
import { onScrollFrame, revealLinesOnEnter } from "@/lib/motion/reveal";
import { readFreeze } from "@/lib/freeze";

/** Manifesto motion: line reveal on enter, and the last sentence's words scrub muted → ink. */
export function ManifestoMotion() {
  useEffect(() => {
    const p = document.querySelector<HTMLElement>("[data-manifesto]");
    const scrub = p?.querySelector<HTMLElement>("[data-scrub]");
    if (!p || !scrub || readFreeze()) return;
    const words = [...scrub.querySelectorAll<HTMLElement>("[data-word]")];
    const stopReveal = revealLinesOnEnter(p.firstElementChild as HTMLElement);
    // words turn ink one after another while the sentence travels from 70% to 40% of the viewport
    const stopScrub = onScrollFrame(() => {
      const r = scrub.getBoundingClientRect();
      const vh = window.innerHeight;
      const g = Math.min(1, Math.max(0, (vh * 0.7 - (r.top + r.height / 2)) / (vh * 0.3)));
      words.forEach((w, i) => w.style.setProperty("--p", String(Math.min(1, Math.max(0, g * words.length - i)))));
    });
    return () => {
      stopReveal();
      stopScrub();
    };
  }, []);
  return null;
}
