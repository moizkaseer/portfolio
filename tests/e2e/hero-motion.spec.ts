/**
 * Automated motion test (DESIGN_SPEC §9.5). Time is driven by Playwright's clock;
 * for every event of the four example loops (the same list TIMELINE.md was built
 * from) the DOM must equal deriveVisuals(stateAt(k, t)), and after every packet
 * move the packet's centre must be within 1px of PACKET_POINTS.
 */
import { test, expect, type Page } from "@playwright/test";
import {
  PACKET_MOVE_S,
  PACKET_POINTS,
  buildLoopEvents,
  deriveVisuals,
  loopDuration,
  stateAt,
} from "../../lib/motion/hero-motion";
import { STEP_T } from "../../lib/motion/hero-controller";

async function readDom(page: Page, layout: "desktop" | "mobile") {
  return page.evaluate((layout) => {
    const q = (s: string) => document.querySelector<HTMLElement>(s)!;
    const all = (s: string) => [...document.querySelectorAll<HTMLElement>(s)];
    const m = layout === "mobile";
    return {
      lines: all("[data-line]").map((e) => e.dataset.status),
      nodes: [0, 1, 2, 3].map((i) => q(`[data-node="${i}"]`).dataset.state),
      shipped: q('[data-node="shipped"]').dataset.state === "running",
      wires: Object.fromEntries(all("[data-wire]").map((e) => [e.dataset.wire, e.dataset.lit === "true"])),
      logRows: q("[data-log]").children.length,
      newestRow: (q("[data-log]").lastElementChild as HTMLElement | null)?.dataset.new === "true",
      panelLabel: q(m ? "[data-panel-m]" : "[data-panel-d]").textContent!.trim(),
      underline: q("[data-underline]").dataset.lit === "true",
      chevron: q("[data-chevron]").dataset.lit === "true",
      typed: (q("#task-input") as HTMLInputElement).value,
      boxes: all("[data-box]").map((e) => ({ shown: e.dataset.shown === "true", border: e.dataset.border, dashed: e.dataset.dashed === "true", title: e.querySelector("[data-title]")!.textContent })),
      connectors: all("[data-nodes] [data-drawn]").map((e) => ({ drawn: e.dataset.drawn === "true", packet: (e.firstElementChild as HTMLElement).dataset.on === "true" })),
      status: q(m ? "[data-status-text-m]" : "[data-status-text]").textContent!.trim(),
      summary: q(m ? "[data-summary-m]" : "[data-summary]").textContent!.trim(),
      selectedChip: all("[data-selected]").findIndex((e) => e.dataset.selected === "true"),
    };
  }, layout);
}

function expected(k: number, t: number, layout: "desktop" | "mobile") {
  const { hero, prompt } = deriveVisuals(stateAt(k, t));
  const m = layout === "mobile";
  return {
    lines: hero.lines,
    nodes: hero.nodes,
    shipped: hero.shippedNodeLit,
    wires: { seg0: hero.wireLit.seg0, seg1: hero.wireLit.seg1, seg2: hero.wireLit.seg2, out: hero.wireLit.out, rail: hero.wireLit.rail },
    logRows: hero.logRows.length,
    newestRow: hero.logRows.length > 0,
    panelLabel: m ? hero.panelLabelMobile : hero.panelLabel,
    underline: prompt.underlineLit,
    chevron: prompt.chevronLit,
    typed: prompt.typed,
    boxes: prompt.nodes.map((n) => ({ shown: n.shown, border: n.border, dashed: n.dashed, title: n.title })),
    connectors: prompt.nodes.slice(1).map((n) => ({ drawn: n.connectorIn!.drawn, packet: n.connectorIn!.packet })),
    status: m ? prompt.statusMobile : prompt.status,
    summary: m ? prompt.summaryMobile : prompt.summary,
    selectedChip: prompt.selectedChip,
  };
}

async function packetCentre(page: Page, layout: "desktop" | "mobile") {
  return page.evaluate((w) => {
    const stage = document.querySelector<HTMLElement>("[data-hero-stage]")!.getBoundingClientRect();
    const p = document.querySelector<HTMLElement>("[data-packet]")!.getBoundingClientRect();
    const s = stage.width / w;
    return [(p.left + p.width / 2 - stage.left) / s, (p.top + p.height / 2 - stage.top) / s];
  }, layout === "desktop" ? 1440 : 390);
}

test.describe("hero motion matches the design timeline", () => {
  test.setTimeout(180_000);

  // The motion code is the same in every browser: Chromium plays all four loops, WebKit one
  // complete loop (example 1) with the same checks, then the hand-off into example 2.
  test("every loop's events and packet stops (four on Chromium, one on WebKit)", async ({ page }, info) => {
    const layout = !!info.project.use.isMobile ? "mobile" : "desktop";
    const loops = info.project.use.defaultBrowserType === "webkit" ? 1 : 4;
    await page.clock.install();
    await page.goto("/?freeze=manual");
    await page.waitForFunction(() => !!window.__heroTest);
    await page.evaluate(() => document.fonts.ready);
    const t0 = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(t0 + 1000);
    await page.evaluate(() => window.__heroTest!.start());

    let clock = 0; // ms since start()
    const advanceTo = async (target: number) => {
      if (target > clock) await page.clock.runFor(target - clock);
      clock = Math.max(clock, target);
      await page.evaluate(() => window.__heroTest!.tick());
    };

    let offset = 0;
    for (let k = 0; k < loops; k++) {
      const times = [...new Set(buildLoopEvents(k).events.map((e) => e.t))];
      // packet checks: after each move has finished — or on the last ms of the hold where the
      // design starts the next move first (steps 1, 3, 5: 480ms hold, 500ms move; < 0.1px short)
      const packetChecks = STEP_T.slice(1).map((t, i) => {
        const step = i + 1;
        const end = t + PACKET_MOVE_S[step] * 1000;
        return { t: step < 10 ? Math.min(end, STEP_T[step + 1] - 1) : end, step };
      });
      const schedule = [
        ...times.map((t) => ({ t, kind: "state" as const })),
        ...packetChecks.map((p) => ({ t: p.t, kind: "packet" as const, step: p.step })),
      ].sort((a, b) => a.t - b.t);

      for (const item of schedule) {
        await advanceTo(offset + item.t);
        if (item.kind === "state") {
          expect(await readDom(page, layout), `loop ${k + 1}, t=${item.t}ms`).toEqual(expected(k, item.t, layout));
        } else {
          const [x, y] = await packetCentre(page, layout);
          const [ex, ey] = PACKET_POINTS[layout][item.step];
          expect(Math.abs(x - ex), `loop ${k + 1} packet x at step ${item.step}`).toBeLessThanOrEqual(1);
          expect(Math.abs(y - ey), `loop ${k + 1} packet y at step ${item.step}`).toBeLessThanOrEqual(1);
        }
      }
      offset += loopDuration(k);
    }

    // after the fourth loop the cycle starts again with example 1 (73.7s total); after one, example 2 begins
    if (loops === 4) expect(offset).toBe(73686);
    await advanceTo(offset + 1);
    expect(await readDom(page, layout)).toEqual(expected(loops % 4, 1, layout));
    const [x, y] = await packetCentre(page, layout);
    expect([Math.round(x), Math.round(y)]).toEqual([...PACKET_POINTS[layout][0]]);
  });
});
