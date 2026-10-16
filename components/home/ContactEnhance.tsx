"use client";

import { useEffect, useRef } from "react";
import { PREFILL_EVENT, type ContactPrefill } from "@/lib/prompt-store";

/**
 * Tiny client hook-up for the server-rendered contact form: applies prefills from the prompt
 * (C2) right away, and loads the in-place submit code (./contact-enhance) when the form comes
 * near the viewport or gets focus.
 */
export function ContactEnhance() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const prefill = (e: Event) => {
      const p = (e as CustomEvent<ContactPrefill>).detail;
      (form.elements.namedItem("task") as HTMLTextAreaElement).value = p.summary;
      (form.elements.namedItem("system") as HTMLInputElement).value = p.system ? JSON.stringify(p.system) : "";
      form.querySelector<HTMLElement>("[data-attached]")!.hidden = !p.system;
      form.removeAttribute("data-sent");
    };
    window.addEventListener(PREFILL_EVENT, prefill);
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      io.disconnect();
      import("./contact-enhance").then((m) => m.enhanceContactForm(form));
    };
    const io = new IntersectionObserver(([e]) => e.isIntersecting && load(), { rootMargin: "100% 0px" });
    io.observe(form);
    form.addEventListener("focusin", load, { once: true });
    return () => {
      window.removeEventListener(PREFILL_EVENT, prefill);
      io.disconnect();
    };
  }, []);
  return <span ref={ref} hidden />;
}
