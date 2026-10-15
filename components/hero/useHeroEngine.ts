"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { parseCubicBezier } from "@/lib/motion/cubic-bezier";
import {
  PACKET_EASE,
  PACKET_POINTS,
  REDUCED_MOTION_STATE,
  TEMPLATES,
  stateAt,
  type HeroState,
} from "@/lib/motion/hero-motion";
import {
  createController,
  createReducedController,
  onFocus as ctlFocus,
  onType as ctlType,
  packetAt,
  runUser as ctlRun,
  sameState,
  stateAtClock,
  type Controller,
  type Layout,
  type Mode,
} from "@/lib/motion/hero-controller";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { FREEZE_ALLOWED, readFreeze } from "@/lib/freeze";

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeLayout(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useLayout(): Layout {
  return useSyncExternalStore(
    subscribeLayout,
    () => (window.matchMedia(DESKTOP_QUERY).matches ? "desktop" : "mobile"),
    () => "desktop",
  );
}

// PACKET_EASE — cubic-bezier(0.65, 0, 0.35, 1) — evaluated exactly as CSS would.
const ease = parseCubicBezier(PACKET_EASE);

/** Freeze states for the fidelity check (DESIGN_SPEC §9, §10). Returns [example, ms] or "reduced". */
function parseFreeze(f: string): [number, number] | "reduced" | null {
  if (f === "hero-start") return [0, 0];
  if (f === "hero-done") return [0, 9460];
  if (f === "prompt-done") return [0, 16150];
  if (f === "reduced") return "reduced";
  const m = f.match(/^t(\d+)(?:k(\d))?$/); // e.g. t17000, t400k2
  if (m) return [Number(m[2] ?? 0), Number(m[1])];
  return null;
}

export interface HeroTestHook {
  /** Start the clock at the current (fake) time; the loop is then advanced only by tick(). */
  start(): void;
  /** Recompute the state for the current time and render it synchronously. */
  tick(): void;
  info(): { now: number; mode: Mode; k: number; loopStart: number };
}

declare global {
  interface Window {
    __heroTest?: HeroTestHook;
  }
}

type Boot = "live" | "reduced" | "manual" | `freeze:${string}`;

function subscribeBoot(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getBoot(): Boot {
  const f = readFreeze();
  if (FREEZE_ALLOWED && f === "manual") return "manual";
  if (prefersReducedMotion() || f === "reduced") return "reduced";
  if (f && parseFreeze(f)) return `freeze:${f}`;
  return "live";
}

const INITIAL = stateAt(0, 0);

export function useHeroEngine() {
  // How the stage runs: the live loop, reduced motion, a ?freeze state, or the motion test.
  const boot = useSyncExternalStore<Boot>(subscribeBoot, getBoot, () => "live");
  const frozen = boot.startsWith("freeze:") ? (parseFreeze(boot.slice(7)) as [number, number]) : null;
  const isStatic = boot === "reduced" || frozen !== null;

  const ctrl = useRef<Controller>(createController());
  const now = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);
  // null until the clock (or the visitor) produces a state; until then the boot state shows.
  const [live, setLive] = useState<{ state: HeroState; mode: Mode } | null>(null);
  const shown = useRef<HeroState>(INITIAL);
  const shownMode = useRef<Mode>("auto");

  const base: { state: HeroState; mode: Mode } =
    boot === "reduced"
      ? { state: REDUCED_MOTION_STATE, mode: "user" }
      : frozen
        ? { state: stateAt(frozen[0], frozen[1]), mode: "auto" }
        : { state: INITIAL, mode: "auto" };
  const { state, mode } = live ?? base;

  /** Packet on the design frame: settled at its step when static, else written every frame by the clock. */
  const settled = isStatic ? Math.min(state.step, 10) : 0;
  const packetStyle = {
    "--px": PACKET_POINTS.desktop[settled][0],
    "--py": PACKET_POINTS.desktop[settled][1],
    "--pxm": PACKET_POINTS.mobile[settled][0],
    "--pym": PACKET_POINTS.mobile[settled][1],
  } as CSSProperties;

  const placePacket = useCallback((d: [number, number], m: [number, number]) => {
    const el = packetRef.current;
    if (!el) return;
    el.style.setProperty("--px", String(d[0]));
    el.style.setProperty("--py", String(d[1]));
    el.style.setProperty("--pxm", String(m[0]));
    el.style.setProperty("--pym", String(m[1]));
  }, []);

  /** Recompute everything for clock time t. */
  const render = useCallback(
    (t: number) => {
      const c = ctrl.current;
      const s = stateAtClock(c, t);
      if (!sameState(s, shown.current) || c.mode !== shownMode.current) {
        shown.current = s;
        shownMode.current = c.mode;
        setLive({ state: s, mode: c.mode });
      }
      if (!c.instant) placePacket(packetAt(c, t, "desktop", ease), packetAt(c, t, "mobile", ease));
    },
    [placePacket, setLive],
  );

  // Mark the stage as interactive once hydrated (tests wait for it).
  useEffect(() => {
    stageRef.current?.setAttribute("data-ready", "true");
  }, []);

  // Reduced motion uses the finished-state controller; the motion test exposes its hook.
  useEffect(() => {
    if (boot === "reduced") {
      ctrl.current = createReducedController();
      shown.current = REDUCED_MOTION_STATE;
      shownMode.current = "user";
    }
    if (boot !== "manual") return;
    let origin = 0;
    window.__heroTest = {
      start() {
        origin = performance.now();
        now.current = 0;
        ctrl.current = createController();
        flushSync(() => render(0));
      },
      tick() {
        now.current = performance.now() - origin;
        flushSync(() => render(now.current));
      },
      info: () => ({ now: now.current, mode: ctrl.current.mode, k: ctrl.current.k, loopStart: ctrl.current.loopStart }),
    };
    return () => {
      delete window.__heroTest;
    };
  }, [boot, render]);

  // The pausable clock: runs only while the stage is on screen and the tab is visible.
  const renderRef = useRef(render);
  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  useEffect(() => {
    if (boot !== "live") return;
    const stage = stageRef.current;
    if (!stage) return;

    let inView = true;
    let raf = 0;
    let last: number | null = null;

    const frame = (ts: number) => {
      if (last !== null) now.current += ts - last;
      last = ts;
      renderRef.current(now.current);
      raf = requestAnimationFrame(frame);
    };
    const update = () => {
      const run = inView && document.visibilityState === "visible";
      if (run && !raf) {
        last = null;
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    io.observe(stage);
    document.addEventListener("visibilitychange", update);
    update();

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
      cancelAnimationFrame(raf);
      raf = 0;
    };
  }, [boot]);

  // Visitor actions. Frozen screenshots ignore them; reduced motion applies them instantly.
  const act = (fn: (c: Controller, t: number) => void) => {
    if (frozen) return;
    fn(ctrl.current, now.current);
    render(now.current);
  };

  return {
    stageRef,
    packetRef,
    packetStyle,
    state,
    mode,
    isStatic,
    onFocus: () => act(ctlFocus),
    onType: (value: string) => act((c, t) => ctlType(c, t, value)),
    runUser: (text: string, idx?: number) => act((c, t) => void ctlRun(c, t, text, idx)),
    templates: TEMPLATES,
  };
}
