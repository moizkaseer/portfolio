/**
 * hero-controller.ts — one pausable clock for the hero + "Your turn" prompt.
 *
 * Wraps hero-motion.ts (used as-is) into the full behaviour of the design file
 * (HeroCombo.html): the automatic loop, visitor takeover, the visitor's own builds,
 * and the packet's position at any millisecond. Pure functions of the clock time,
 * so a paused clock resumes exactly where it stopped and tests are deterministic.
 */
import {
  HOLDS_MS,
  PACKET_MOVE_S,
  PACKET_POINTS,
  PROMPT_MS,
  REDUCED_MOTION_STATE,
  TEMPLATES,
  loopDuration,
  matchTemplate,
  stateAt,
  type HeroState,
  type Phase,
} from "./hero-motion";

export type Layout = "desktop" | "mobile";
export type Mode = "auto" | "user";

/** When each hero step starts, ms from the start of a run: [0, 1400, 1880, …, 9460]. */
export const STEP_T: number[] = HOLDS_MS.reduce<number[]>((acc, h) => [...acc, acc[acc.length - 1] + h], [0]);

/** One hero run on its own, once the visitor has taken over: run + rest at step 10. */
const HERO_CYCLE = STEP_T[10] + PROMPT_MS.heroRestAfterTakeover;

type PromptFields = Pick<HeroState, "typed" | "tpl" | "nextTpl" | "revealed" | "active" | "phase">;

export interface Controller {
  mode: Mode;
  /** Auto loop: example k, started at clock time loopStart. */
  k: number;
  loopStart: number;
  /** User mode: clock time at which the hero's current run starts (may be in the future = resting at step 10). */
  heroAnchor: number;
  /** User mode: prompt fields, and the start time of the visitor's build (null = no build running). */
  prompt: PromptFields;
  buildStart: number | null;
  /** Reduced motion: no timeline at all, builds are instant. */
  instant: boolean;
}

export function createController(): Controller {
  return {
    mode: "auto",
    k: 0,
    loopStart: 0,
    heroAnchor: 0,
    prompt: { typed: "", tpl: -1, nextTpl: 0, revealed: 0, active: -1, phase: "idle" },
    buildStart: null,
    instant: false,
  };
}

/** Reduced motion: the finished state, nothing moves (DESIGN_SPEC §4, §10). */
export function createReducedController(): Controller {
  const { typed, tpl, nextTpl, revealed, active, phase } = REDUCED_MOTION_STATE;
  return {
    ...createController(),
    mode: "user",
    heroAnchor: Number.NEGATIVE_INFINITY,
    prompt: { typed, tpl, nextTpl, revealed, active, phase },
    instant: true,
  };
}

/** Advance the automatic loop to `now` (moves to the next example when a loop ends). */
function syncAuto(c: Controller, now: number) {
  while (now - c.loopStart >= loopDuration(c.k)) {
    c.loopStart += loopDuration(c.k);
    c.k = (c.k + 1) % TEMPLATES.length;
  }
}

/** Hero step + time into that step, in user mode. */
function heroUser(c: Controller, now: number): { step: number; since: number } {
  if (c.instant) return { step: 10, since: Infinity };
  const h = now - c.heroAnchor;
  if (h < 0) return { step: 10, since: Infinity }; // resting at the prompt, restart pending
  const t = h % HERO_CYCLE;
  let step = 0;
  for (let s = 10; s >= 0; s--) {
    if (t >= STEP_T[s]) {
      step = s;
      break;
    }
  }
  return { step, since: t - STEP_T[step] };
}

/** The visitor's build (Enter, Generate, chip): PROMPT_MS.user timings. */
function promptUser(c: Controller, now: number): PromptFields {
  if (c.buildStart === null) return c.prompt;
  const { revealEach, beforeRun, runStep, settle } = PROMPT_MS.user;
  const dt = now - c.buildStart;
  const runAt = 5 * revealEach + beforeRun;
  const doneAt = runAt + 4 * runStep + settle;
  let phase: Phase = "building";
  let revealed = Math.min(5, Math.floor(dt / revealEach));
  let active = -1;
  if (dt >= doneAt) {
    phase = "done";
    revealed = 5;
  } else if (dt >= runAt) {
    phase = "running";
    revealed = 5;
    active = Math.min(4, Math.floor((dt - runAt) / runStep));
  }
  return { ...c.prompt, phase, revealed, active };
}

/** The full state at clock time `now`. */
export function stateAtClock(c: Controller, now: number): HeroState {
  if (c.mode === "auto") {
    syncAuto(c, now);
    return stateAt(c.k, now - c.loopStart);
  }
  const { step } = heroUser(c, now);
  return { step, jump: step === 0, ...promptUser(c, now) };
}

/** Packet centre on the design frame at clock time `now`. Moves are straight lines between the wire's corners. */
export function packetAt(c: Controller, now: number, layout: Layout, ease: (p: number) => number): [number, number] {
  let step: number;
  let since: number;
  if (c.mode === "auto") {
    syncAuto(c, now);
    const elapsed = now - c.loopStart;
    step = stateAt(c.k, elapsed).step;
    since = elapsed - STEP_T[step];
  } else {
    ({ step, since } = heroUser(c, now));
  }
  const pts = PACKET_POINTS[layout];
  const to = pts[step];
  if (step === 0) return [to[0], to[1]]; // loop restart: jump, no transition
  const from = pts[step - 1];
  const p = ease(Math.min(1, Math.max(0, since / (PACKET_MOVE_S[step] * 1000))));
  return [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
}

/**
 * Visitor takeover (design `takeOver()`): stop the prompt's autoplay for good; the
 * hero keeps looping on its own. If the hero is resting at the prompt (step 10), it
 * restarts after heroRestartAfterTakeoverAtPrompt.
 */
function takeOver(c: Controller, now: number) {
  const s = stateAtClock(c, now);
  if (c.mode === "auto") {
    c.prompt = { typed: s.typed, tpl: s.tpl, nextTpl: s.nextTpl, revealed: s.revealed, active: s.active, phase: s.phase };
    c.heroAnchor = c.loopStart; // the hero run in progress continues on the same timeline
  } else {
    c.prompt = promptUser(c, now); // freeze a build in progress where it is
  }
  c.buildStart = null;
  c.mode = "user";
  if (!c.instant && s.step >= 10) c.heroAnchor = now + PROMPT_MS.heroRestartAfterTakeoverAtPrompt;
}

/** Focus on the input: only acts while autoplay runs (design `onFocus`). */
export function onFocus(c: Controller, now: number) {
  if (c.mode !== "auto") return;
  takeOver(c, now);
  c.prompt = { ...c.prompt, phase: c.prompt.revealed ? "done" : "idle", active: -1 };
}

/** The visitor types (design `onType`). */
export function onType(c: Controller, now: number, value: string) {
  takeOver(c, now);
  c.prompt = { ...c.prompt, typed: value, phase: "idle", active: -1 };
}

/** Enter, Generate or a chip (design `runUser`). Returns the template index used. */
export function runUser(c: Controller, now: number, text: string, idx?: number): number {
  takeOver(c, now);
  const tpl = typeof idx === "number" ? idx : matchTemplate(text);
  if (c.instant) {
    // reduced motion: the finished system appears at once (with a 200ms fade in CSS)
    c.prompt = { ...c.prompt, typed: text, tpl, revealed: 5, active: -1, phase: "done" };
  } else {
    c.prompt = { ...c.prompt, typed: text, tpl, revealed: 0, active: -1, phase: "building" };
    c.buildStart = now;
  }
  return tpl;
}

/**
 * The smart engine is drafting (up to 2.5s): show "Designing the system · 0 / 5" with the
 * visitor's words in place, then runUser() builds with the result (or the template fallback).
 */
export function beginDesign(c: Controller, now: number, text: string) {
  takeOver(c, now);
  c.prompt = { ...c.prompt, typed: text, tpl: -2, revealed: 0, active: -1, phase: "building" };
}

export function sameState(a: HeroState, b: HeroState) {
  return (
    a.step === b.step &&
    a.jump === b.jump &&
    a.phase === b.phase &&
    a.tpl === b.tpl &&
    a.nextTpl === b.nextTpl &&
    a.typed === b.typed &&
    a.revealed === b.revealed &&
    a.active === b.active
  );
}
