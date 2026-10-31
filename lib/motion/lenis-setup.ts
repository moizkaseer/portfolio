import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";
import { setScroller } from "./scroll";

/** Lenis driven from GSAP's ticker (brief §2). Returns a cleanup function. */
export function startSmoothScroll() {
  const lenis = new Lenis({ anchors: { offset: -64 } });
  lenis.on("scroll", ScrollTrigger.update);
  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  setScroller(lenis);

  // Lenis outlives client-side navigations (it's mounted once, in the root layout) and keeps
  // easing toward whatever target the old page last set, fighting the new page's scroll-to-top.
  // <main>'s children are replaced wholesale on every route change (but not on a same-page
  // #hash jump, which should keep using Lenis's own anchor-scroll smoothing), so a
  // MutationObserver catches exactly that. Its callback runs as a microtask — after the
  // router's own scroll-reset layout effect, but before the GSAP ticker's next frame can let
  // Lenis's old animation fight it. stop()+start() drops that in-flight animation and resyncs
  // Lenis to the DOM's actual (already-settled) scroll position.
  const main = document.getElementById("main");
  const observer = new MutationObserver(() => {
    lenis.stop();
    lenis.start();
  });
  if (main) observer.observe(main, { childList: true });

  return () => {
    observer.disconnect();
    gsap.ticker.remove(raf);
    lenis.destroy();
    setScroller(null);
  };
}
