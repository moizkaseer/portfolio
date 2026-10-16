// Port of design-reference/motion/hero-motion.check.js — every expectation, unchanged.
// It proves lib/motion/hero-motion.ts matches the approved design to the millisecond.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as m from "@/lib/motion/hero-motion";

const root = join(__dirname, "..", "..");
const source = (f: string) => readFileSync(join(root, "design-reference", "source", f), "utf8");

describe("hero-motion.ts is the design's module, as-is", () => {
  it("is byte-identical to design-reference/motion/hero-motion.ts", () => {
    expect(readFileSync(join(root, "lib", "motion", "hero-motion.ts"), "utf8")).toBe(
      readFileSync(join(root, "design-reference", "motion", "hero-motion.ts"), "utf8"),
    );
  });
});

describe("hero-motion.check.js", () => {
  const stepAt = (t: number) => m.stateAt(0, t).step;

  it("loop durations equal the timeline computed from the design", () => {
    expect(m.loopDuration(0)).toBe(18874);
    expect(m.loopDuration(1)).toBe(18517);
    expect(m.loopDuration(2)).toBe(18126);
    expect(m.loopDuration(3)).toBe(18169);
  });

  it("hero step timestamps", () => {
    expect(stepAt(1399)).toBe(0);
    expect(stepAt(1400)).toBe(1);
    expect(stepAt(7660)).toBe(8);
    expect(stepAt(9460)).toBe(10);
  });

  it("typing starts at the same moment as step 10", () => {
    expect(m.stateAt(0, 9460).phase).toBe("typing");
    expect(m.stateAt(0, 9459).typed).toBe("");
    expect(m.stateAt(0, 9494).typed).toBe("R");
    expect(m.stateAt(0, 12250).typed).toBe("Reconcile invoices from Gmail into our accounting tool");
    expect(m.stateAt(0, 12670).phase).toBe("building");
    expect(m.stateAt(0, 13870).revealed).toBe(5);
    expect(m.stateAt(0, 16150).active).toBe(4);
    expect(m.stateAt(0, 18350).phase).toBe("erasing");
    expect(m.stateAt(0, 18674).typed).toBe("");
  });

  it("ghosts: during the hero run the prompt shows the upcoming example's titles", () => {
    const v0 = m.deriveVisuals(m.stateAt(1, 100));
    expect(v0.prompt.nodes.map((n) => n.title)[0]).toBe("Support inbox");
    expect(v0.prompt.nodes.every((n) => !n.shown)).toBe(true);
    expect(v0.prompt.underlineLit).toBe(false);
    expect(v0.hero.lines).toEqual(["running", "queued", "queued", "queued"]);
  });

  it("lines, wires, underline, log and summary", () => {
    const v1 = m.deriveVisuals(m.stateAt(0, 1400));
    expect(v1.hero.lines).toEqual(["done", "queued", "queued", "queued"]);
    expect(v1.hero.wireLit.seg0).toBe(true);
    const v10 = m.deriveVisuals(m.stateAt(0, 9460));
    expect(v10.prompt.underlineLit).toBe(true);
    expect(v10.hero.logRows.length).toBe(5);
    expect(m.deriveVisuals(m.stateAt(0, 13000)).prompt.summary).toBe("5 steps · 1 model · 1 human check");
  });

  it("template matching", () => {
    expect(m.matchTemplate("please reconcile my invoices")).toBe(0);
    expect(m.matchTemplate("water the plants")).toBe(-2);
  });

  it("packet points and step timings match the design source files", () => {
    const pts = (src: string) => JSON.parse(src.match(/const P = (\[\[.*?\]\]);/)![1]);
    const phoneSrc = source("HeroComboMobile.html");
    expect(m.PACKET_POINTS.mobile).toEqual(pts(phoneSrc));
    expect(m.PACKET_POINTS.desktop).toEqual(pts(source("HeroCombo.html")));
    const phoneHolds = JSON.parse(phoneSrc.match(/const holds = (\[[^\]]*\])/)![1]);
    expect(phoneHolds.slice(0, 10)).toEqual([...m.HOLDS_MS]);
  });
});

describe("content/systems.json mirrors the module's templates", () => {
  it("has the same templates, keywords and generic fallback", async () => {
    const systems = (await import("@/content/systems.json")).default;
    expect(systems.templates.map((t) => [t.chip, t.prompt, t.nodes.map((n) => [n.kind, n.title])])).toEqual(
      m.TEMPLATES.map((t) => [t.chip, t.prompt, t.nodes]),
    );
    expect(systems.generic.nodes.map((n) => [n.kind, n.title])).toEqual(m.GENERIC_TEMPLATE.nodes);
    systems.templates.forEach((t, i) => t.keywords.forEach((k) => expect(m.matchTemplate(k)).toBe(i)));
  });
});
