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
  return () => {
    gsap.ticker.remove(raf);
    lenis.destroy();
    setScroller(null);
  };
}
