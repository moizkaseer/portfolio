"use client";

import { setTheme } from "@/lib/theme";
import { prefillContact } from "@/lib/prompt-store";
import { scrollToTargetAsync } from "@/lib/motion/scroll";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { traceLabel, type UiAction } from "./protocol";

/**
 * Runs the agent's UI actions in the browser (C1): the ghost pointer glides to the target first
 * (expo-out, 600ms), then the action happens. The visitor's own cursor is never touched, and any
 * wheel, touch, key press or click from the visitor cancels what's left (AbortSignal).
 * Reduced motion: no glide — the action happens at once with a short outline on the target.
 */
type Router = { push: (href: string) => void };
let router: Router | null = null;
export const setAgentRouter = (r: Router) => (router = r);

const GLIDE_MS = 600;
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("cancelled", "AbortError"));
    const t = window.setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (window.clearTimeout(t), reject(new DOMException("cancelled", "AbortError"))), { once: true });
  });

const visible = (el: Element | null): el is HTMLElement => !!el && (el as HTMLElement).getClientRects().length > 0;
const find = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find(visible) ?? null;

async function waitFor(check: () => boolean, signal: AbortSignal, ms = 5000) {
  const end = performance.now() + ms;
  while (!check()) {
    if (performance.now() > end) throw new Error("the page didn't load in time");
    await sleep(50, signal);
  }
}

// ---------- the ghost pointer ----------
let pointer: HTMLElement | null = null;
function ghost() {
  if (pointer) return pointer;
  pointer = document.createElement("div");
  pointer.className = "agent-ghost";
  pointer.setAttribute("aria-hidden", "true");
  pointer.innerHTML =
    '<svg width="22" height="24" viewBox="0 0 22 24"><path d="M2 2 L2 19 L7 14.5 L10.5 22 L13.5 20.6 L10 13.2 L17 13 Z"/></svg><span></span>';
  pointer.style.transform = `translate(${window.innerWidth - 80}px, ${window.innerHeight - 80}px)`;
  document.body.appendChild(pointer);
  return pointer;
}

async function glideTo(el: HTMLElement, label: string, signal: AbortSignal) {
  if (prefersReducedMotion()) {
    el.setAttribute("data-agent-flash", "");
    window.setTimeout(() => el.removeAttribute("data-agent-flash"), 1200);
    return;
  }
  const p = ghost();
  p.querySelector("span")!.textContent = `agent · ${label}`;
  const r = el.getBoundingClientRect();
  const x = Math.min(window.innerWidth - 40, Math.max(8, r.left + Math.min(r.width * 0.47, r.width - 12)));
  const y = Math.min(window.innerHeight - 40, Math.max(8, r.top + Math.min(r.height / 2, 40)));
  p.dataset.on = "true";
  p.style.transform = `translate(${x}px, ${y}px)`;
  await sleep(GLIDE_MS + 60, signal);
}

export function hideGhost() {
  if (pointer) pointer.dataset.on = "false";
}

// ---------- navigation helpers ----------
async function ensurePath(path: string, ready: string, signal: AbortSignal) {
  if (location.pathname !== path) {
    router?.push(path);
    await waitFor(() => location.pathname === path && !!document.querySelector(ready), signal);
    await sleep(200, signal);
  }
}

const SECTION_TARGET: Record<string, string> = {
  "your-turn": "#your-turn-h",
  work: "#work [data-rail-tick]",
  process: "#process [data-rail-tick]",
  agent: "#agent [data-rail-tick]",
  toolbox: "#toolbox [data-rail-tick]",
  contact: "#contact [data-rail-tick]",
};

/** Runs one validated UI action. Resolves with a short result for the model and the trace. */
export async function runUiAction(a: UiAction, signal: AbortSignal): Promise<string> {
  const label = traceLabel(a.tool, a.input).replace(/\(.*\)$/, "").replace("ui.", "");
  const reduced = prefersReducedMotion();
  switch (a.tool) {
    case "ui_scroll_to": {
      await ensurePath("/", "[data-hero-stage]", signal);
      const el = find(SECTION_TARGET[a.input.section]) ?? document.getElementById(a.input.section);
      if (!el) throw new Error("section not found");
      await scrollToTargetAsync(el, { immediate: reduced });
      await glideTo(el, label, signal);
      return `scrolled to ${a.input.section}`;
    }
    case "ui_highlight_project": {
      await ensurePath("/", "[data-hero-stage]", signal);
      const row = find(`[data-run="${a.input.slug}"]`) ?? find(`[data-card="${a.input.slug}"]`);
      if (!row) throw new Error("project not on the page");
      await scrollToTargetAsync(row, { immediate: reduced, block: "center" });
      await glideTo(row, label, signal);
      if (row.dataset.run) row.dispatchEvent(new PointerEvent("pointerover", { bubbles: true })); // opens the row like a hover
      row.setAttribute("data-agent-lit", "");
      window.setTimeout(() => row.removeAttribute("data-agent-lit"), 4000);
      await sleep(500, signal);
      return `highlighted ${a.input.slug}`;
    }
    case "ui_open_project": {
      const link =
        find(`[data-run="${a.input.slug}"]`) ?? find(`[data-card="${a.input.slug}"]`) ?? find(`[data-work-row="${a.input.slug}"]`) ?? find(`a[href="/work/${a.input.slug}"]`);
      if (link) {
        if (link.getBoundingClientRect().bottom < 0 || link.getBoundingClientRect().top > innerHeight) await scrollToTargetAsync(link, { immediate: reduced, block: "center" });
        await glideTo(link, label, signal);
      }
      router?.push(`/work/${a.input.slug}`);
      await waitFor(() => location.pathname === `/work/${a.input.slug}`, signal);
      hideGhost();
      return `opened the run report for ${a.input.slug}`;
    }
    case "ui_set_theme": {
      const toggle = find("header [data-theme-toggle]");
      if (toggle) await glideTo(toggle, label, signal);
      setTheme(a.input.theme);
      return `theme is now ${a.input.theme === "dark" ? "night shift" : "day shift"}`;
    }
    case "ui_highlight_tools": {
      await ensurePath("/", "[data-hero-stage]", signal);
      const box = document.getElementById("toolbox");
      if (box) await scrollToTargetAsync(box, { immediate: reduced });
      const els = a.input.names.map((n) => find(`[data-tool="${CSS.escape(n)}"]`)).filter(Boolean) as HTMLElement[];
      if (els[0]) await glideTo(els[0], label, signal);
      els.forEach((el) => el.setAttribute("data-agent-lit", ""));
      window.setTimeout(() => els.forEach((el) => el.removeAttribute("data-agent-lit")), 5000);
      return `highlighted ${els.length} tool(s)`;
    }
    case "ui_prefill_contact": {
      await ensurePath("/", "[data-hero-stage]", signal);
      const form = document.querySelector<HTMLElement>("#contact form");
      if (!form) throw new Error("contact form not found");
      await scrollToTargetAsync(form, { immediate: reduced });
      const field = form.querySelector<HTMLElement>("textarea");
      if (field) await glideTo(field, label, signal);
      prefillContact({ summary: a.input.summary });
      return "filled 'What should be automated?' — the visitor sends it themselves";
    }
  }
}

/**
 * While the agent acts, the visitor is in charge: their first wheel, touch, key press or click
 * aborts the turn's remaining actions. Returns the controller and a release function.
 */
export function watchForVisitor(onTakeOver: () => void) {
  const ctrl = new AbortController();
  const stop = (e: Event) => {
    if (!e.isTrusted || ctrl.signal.aborted) return;
    ctrl.abort();
    hideGhost();
    onTakeOver();
  };
  const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
  events.forEach((t) => window.addEventListener(t, stop, { capture: true, passive: true }));
  return {
    signal: ctrl.signal,
    release: () => events.forEach((t) => window.removeEventListener(t, stop, { capture: true })),
  };
}
