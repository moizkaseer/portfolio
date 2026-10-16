"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Trace } from "@/lib/content/projects";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { readFreeze } from "@/lib/freeze";

interface Replay {
  trace: Trace;
  /** index of the current row (-1 before the first) */
  index: number;
  elapsed: number;
  playing: boolean;
  finished: boolean;
  speed: 1 | 2 | 4;
  replay: () => void;
  cycleSpeed: () => void;
  /** the terminal registers itself so the replay can autoplay when it scrolls into view */
  observe: (el: HTMLElement | null) => void | (() => void);
}

const Ctx = createContext<Replay | null>(null);
export const useReplay = () => useContext(Ctx);

const noop = () => () => {};
/** ?freeze=run-report shows the design's frame: row 4 of 6 ("route"), 1.34s, 58%. */
const useFrozen = () => useSyncExternalStore(noop, () => readFreeze() === "run-report", () => false);

/**
 * One clock for the trace replay and the diagram above it. Before it plays (server render,
 * no-JS, reduced motion) the whole run is shown, finished. It autoplays once when the
 * terminal scrolls into view; Replay restarts it; Speed cycles 1× / 2× / 4×.
 */
export function ReplayProvider({ trace, children }: { trace: Trace; children: React.ReactNode }) {
  const frozen = useFrozen();
  const [elapsed, setElapsed] = useState(trace.durationMs);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const raf = useRef(0);
  const speedRef = useRef(speed);
  const played = useRef(false);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const play = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (prefersReducedMotion()) {
      setElapsed(trace.durationMs);
      return;
    }
    setPlaying(true);
    let t = 0;
    let last: number | null = null;
    const frame = (ts: number) => {
      if (last !== null) t += (ts - last) * speedRef.current;
      last = ts;
      const done = t >= trace.durationMs;
      setElapsed(Math.min(t, trace.durationMs));
      if (done) setPlaying(false);
      else raf.current = requestAnimationFrame(frame);
    };
    setElapsed(0);
    raf.current = requestAnimationFrame(frame);
  }, [trace.durationMs]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const observe = useCallback(
    (el: HTMLElement | null) => {
      if (!el || frozen || readFreeze()) return;
      const io = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting || played.current) return;
          played.current = true;
          io.disconnect();
          play();
        },
        { threshold: 0.4 },
      );
      io.observe(el);
      return () => io.disconnect();
    },
    [frozen, play],
  );

  const shownElapsed = frozen ? 1337 : elapsed;
  const value = useMemo<Replay>(() => {
    let index = -1;
    trace.rows.forEach((r, i) => {
      if (r.ms <= shownElapsed) index = i;
    });
    return {
      trace,
      index,
      elapsed: shownElapsed,
      playing: !frozen && playing,
      finished: !frozen && shownElapsed >= trace.durationMs,
      speed,
      replay: () => {
        played.current = true;
        play();
      },
      cycleSpeed: () => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1)),
      observe,
    };
  }, [trace, shownElapsed, playing, frozen, speed, play, observe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Node states for the diagram from the replay position. */
export function nodeStates(r: Replay | null): Map<string, "done" | "running" | "pending"> {
  const m = new Map<string, "done" | "running" | "pending">();
  if (!r) return m;
  const current = r.index >= 0 ? r.trace.rows[r.index].node : null;
  r.trace.rows.forEach((row, i) => {
    if (i > r.index) return;
    m.set(row.node, !r.finished && row.node === current ? "running" : "done");
  });
  return m;
}
