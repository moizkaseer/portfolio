import { describe, expect, it } from "vitest";
import {
  STEP_T,
  createController,
  createReducedController,
  onFocus,
  onType,
  packetAt,
  runUser,
  stateAtClock,
} from "@/lib/motion/hero-controller";
import { PACKET_POINTS, PROMPT_MS, REDUCED_MOTION_STATE, TEMPLATES, loopDuration, stateAt } from "@/lib/motion/hero-motion";

const linear = (p: number) => p;

describe("hero controller (one pausable clock over hero-motion.ts)", () => {
  it("step start times follow HOLDS_MS", () => {
    expect(STEP_T).toEqual([0, 1400, 1880, 3280, 3760, 5160, 5640, 7040, 7660, 8560, 9460]);
  });

  it("auto mode is exactly stateAt(k, t) and walks through the four examples", () => {
    const c = createController();
    expect(stateAtClock(c, 12_000)).toEqual(stateAt(0, 12_000));
    const t = loopDuration(0) + 500;
    expect(stateAtClock(c, t)).toEqual(stateAt(1, 500));
    const all = [0, 1, 2, 3].reduce((a, k) => a + loopDuration(k), 0);
    expect(all).toBe(73686);
    expect(stateAtClock(c, all + 10)).toEqual(stateAt(0, 10));
  });

  it("the packet moves in straight lines between wire corners with the move durations", () => {
    const c = createController();
    expect(packetAt(c, 0, "desktop", linear)).toEqual([110, 198]);
    expect(packetAt(c, 1400 + 250, "desktop", linear)).toEqual([110, 265]); // halfway down to (110, 332)
    // step 1 holds 480ms but its move takes 500ms: the next move starts from the corner
    expect(packetAt(c, 1880, "desktop", linear)).toEqual([110, 332]);
    expect(packetAt(c, 9460 + 1050, "mobile", linear)).toEqual([...PACKET_POINTS.mobile[10]]);
  });

  it("takeover during the hero run: the hero continues, then rests 2400ms at step 10 between runs", () => {
    const c = createController();
    onFocus(c, 3000);
    expect(c.mode).toBe("user");
    expect(stateAtClock(c, 3000).step).toBe(2);
    expect(stateAtClock(c, 9460).step).toBe(10);
    expect(stateAtClock(c, 9460 + PROMPT_MS.heroRestAfterTakeover - 1).step).toBe(10);
    const restart = stateAtClock(c, 9460 + PROMPT_MS.heroRestAfterTakeover);
    expect(restart.step).toBe(0);
    expect(restart.jump).toBe(true);
  });

  it("takeover while the hero rests at the prompt: restart after 1600ms", () => {
    const c = createController();
    onType(c, 12_000, "Send weekly report");
    expect(stateAtClock(c, 12_000 + 1599).step).toBe(10);
    expect(stateAtClock(c, 12_000 + 1600).step).toBe(0);
  });

  it("focus keeps the partly typed example; typing replaces it", () => {
    const c = createController();
    const during = stateAt(0, 11_000);
    onFocus(c, 11_000);
    expect(stateAtClock(c, 11_000).typed).toBe(during.typed);
    expect(stateAtClock(c, 11_000).phase).toBe("idle");
    onType(c, 11_100, "abc");
    expect(stateAtClock(c, 20_000)).toMatchObject({ typed: "abc", phase: "idle", active: -1 });
  });

  it("a visitor build uses PROMPT_MS.user timings", () => {
    const c = createController();
    const tpl = runUser(c, 1000, "refund a customer");
    expect(tpl).toBe(1);
    expect(stateAtClock(c, 1000 + 199)).toMatchObject({ phase: "building", revealed: 0 });
    expect(stateAtClock(c, 1000 + 1000)).toMatchObject({ phase: "building", revealed: 5 });
    expect(stateAtClock(c, 1000 + 1160)).toMatchObject({ phase: "running", active: 0 });
    expect(stateAtClock(c, 1000 + 1160 + 4 * 480)).toMatchObject({ phase: "running", active: 4 });
    expect(stateAtClock(c, 1000 + 1160 + 4 * 480 + 600)).toMatchObject({ phase: "done", active: -1, revealed: 5 });
    expect(runUser(c, 9000, "water the plants")).toBe(-2);
  });

  it("typing mid-build freezes the boxes where they are", () => {
    const c = createController();
    runUser(c, 0, "", 3);
    onType(c, 650, "x");
    expect(stateAtClock(c, 5000)).toMatchObject({ revealed: 3, phase: "idle", typed: "x" });
  });

  it("reduced motion: finished state, instant builds, no hero loop", () => {
    const c = createReducedController();
    expect(stateAtClock(c, 0)).toMatchObject({ ...REDUCED_MOTION_STATE, jump: false });
    expect(stateAtClock(c, 50_000).step).toBe(10);
    runUser(c, 10, TEMPLATES[3].prompt, 3);
    expect(stateAtClock(c, 10)).toMatchObject({ tpl: 3, revealed: 5, phase: "done" });
  });
});
