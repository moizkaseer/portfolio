"use client";

import { useEffect } from "react";

const emit = (tool: string | null) => window.dispatchEvent(new CustomEvent("toolbox:hover", { detail: tool }));
const toolOf = (t: EventTarget | null) => (t as Element | null)?.closest?.<HTMLElement>("#toolbox [data-tool]")?.dataset.tool ?? null;

/**
 * Behaviour for two home pieces far down the page, idle-loaded so it stays out of the initial JS:
 * 07's tools highlight the runs that use them (hover / focus), and 08's email copies on click.
 */
export function HomeEnhance() {
  useEffect(() => {
    let timer = 0;
    const over = (e: Event) => {
      const tool = toolOf(e.target);
      if (tool) emit(tool);
    };
    const out = (e: Event) => {
      if (toolOf(e.target) && toolOf((e as FocusEvent).relatedTarget) !== toolOf(e.target)) emit(null);
    };
    const click = async (e: MouseEvent) => {
      const btn = (e.target as Element | null)?.closest?.<HTMLElement>("[data-copy-email]");
      if (!btn) return;
      const email = btn.dataset.copyEmail!;
      try {
        await navigator.clipboard.writeText(email);
      } catch {
        window.location.href = `mailto:${email}`;
        return;
      }
      const toast = document.querySelector<HTMLElement>("[data-copy-toast]");
      if (!toast) return;
      toast.querySelector("[data-toast-text]")!.textContent = "Copied — talk soon";
      toast.dataset.show = "true";
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        toast.dataset.show = "false";
        toast.querySelector("[data-toast-text]")!.textContent = "";
      }, 2400);
    };
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("focusin", over);
    document.addEventListener("focusout", out);
    document.addEventListener("click", click);
    document.documentElement.dataset.homeReady = "";
    return () => {
      delete document.documentElement.dataset.homeReady;
      window.clearTimeout(timer);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("focusin", over);
      document.removeEventListener("focusout", out);
      document.removeEventListener("click", click);
    };
  }, []);
  return null;
}
