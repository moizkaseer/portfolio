/** Scrolling that goes through Lenis when it runs (it loads after idle) and natively otherwise. */
type Scroller = { scrollTo: (el: HTMLElement, opts: { offset: number }) => void };

let scroller: Scroller | null = null;

export function setScroller(s: Scroller | null) {
  scroller = s;
}

export function scrollToTarget(target: string | HTMLElement) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 64;
  if (scroller) scroller.scrollTo(el, { offset: -navH });
  else el.scrollIntoView({ block: "start" });
}
