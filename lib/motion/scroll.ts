/** Scrolling that goes through Lenis when it runs (it loads after idle) and natively otherwise. */
type Scroller = {
  scrollTo: (el: HTMLElement, opts: { offset: number; immediate?: boolean; onComplete?: () => void }) => void;
};

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

/** Scrolls to an element and resolves when the scroll has finished (used by the agent). */
export function scrollToTargetAsync(el: HTMLElement, { immediate = false, block = "start" as "start" | "center" } = {}) {
  const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 64;
  const centreOffset = block === "center" ? -(window.innerHeight - el.getBoundingClientRect().height) / 2 + navH / 2 : 0;
  return new Promise<void>((resolve) => {
    const done = () => resolve();
    const top = el.getBoundingClientRect().top + window.scrollY - navH + centreOffset;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (Math.abs(Math.min(Math.max(0, top), max) - window.scrollY) < 2) return done(); // already there
    if (scroller) {
      scroller.scrollTo(el, { offset: -navH + centreOffset, immediate, onComplete: done });
      window.setTimeout(done, 1600); // safety net
      return;
    }
    window.scrollTo({ top, behavior: immediate ? "auto" : "smooth" });
    if (immediate) return done();
    const t = window.setTimeout(done, 1200);
    window.addEventListener("scrollend", () => (window.clearTimeout(t), done()), { once: true });
  });
}
