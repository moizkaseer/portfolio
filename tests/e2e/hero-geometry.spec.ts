/**
 * Geometry (DESIGN_SPEC §9.4): every positioned element of the hero + prompt stage
 * sits within 2px of the design's coordinates, and phones get the same design scaled.
 */
import { test, expect, type Page } from "@playwright/test";

type Box = { x: number; y: number; w?: number; h?: number };

const DESKTOP: Record<string, Box> = {
  '[data-line="0"]': { x: 150, y: 128 },
  '[data-line="1"]': { x: 300, y: 262 },
  '[data-line="2"]': { x: 450, y: 396 },
  '[data-line="3"]': { x: 600, y: 520 },
  '[data-geo="panel"]': { x: 1010, y: 112, w: 368 },
  '[data-geo="sub"]': { x: 64, y: 772, w: 410 },
  '[data-geo="ctas"]': { x: 560, y: 776 },
  '[data-geo="stats"]': { x: 1010, y: 768, w: 366 },
  '[data-geo="secHead"]': { x: 64, y: 984, w: 1312 },
  '[data-geo="kicker"]': { x: 64, y: 1052 },
  '[data-geo="h2"]': { x: 64, y: 1106 },
  '[data-geo="inputRow"]': { x: 64, y: 1212, w: 1312, h: 88 },
  '[data-geo="chips"]': { x: 64, y: 1316, w: 1312 },
  '[data-geo="statusBlock"]': { x: 64, y: 1420, w: 1312 },
  '[data-geo="cta"]': { x: 64, y: 1700, w: 1312 },
};

const PHONE: Record<string, Box> = {
  '[data-line="0"]': { x: 44, y: 128 },
  '[data-line="1"]': { x: 72, y: 206 },
  '[data-line="2"]': { x: 100, y: 284 },
  '[data-line="3"]': { x: 128, y: 356 },
  '[data-geo="panel"]': { x: 16, y: 470, w: 352 },
  '[data-geo="sub"]': { x: 16, y: 656, w: 350 },
  '[data-geo="ctas"]': { x: 16, y: 748, w: 350 },
  '[data-geo="stats"]': { x: 16, y: 884, w: 350 },
  '[data-geo="secHead"]': { x: 16, y: 1004, w: 350 },
  '[data-geo="kicker"]': { x: 16, y: 1040 },
  '[data-geo="h2"]': { x: 16, y: 1080 },
  '[data-geo="inputRow"]': { x: 16, y: 1220, w: 358, h: 64 },
  '[data-geo="chips"]': { x: 0, y: 1298 },
  '[data-geo="statusBlock"]': { x: 16, y: 1360, w: 358 },
  '[data-geo="nodes"]': { x: 16, y: 1400, w: 358 },
  '[data-geo="cta"]': { x: 16, y: 1828, w: 358 },
};

async function measure(page: Page, stageW: number) {
  return page.evaluate(
    ({ sels, stageW }) => {
      const stage = document.querySelector<HTMLElement>("[data-hero-stage]")!.getBoundingClientRect();
      const s = stage.width / stageW;
      return {
        scale: s,
        boxes: Object.fromEntries(
          sels.map((sel) => {
            const r = document.querySelector<HTMLElement>(sel)!.getBoundingClientRect();
            return [sel, { x: (r.left - stage.left) / s, y: (r.top - stage.top) / s, w: r.width / s, h: r.height / s }];
          }),
        ),
      };
    },
    { sels: Object.keys(stageW === 1440 ? DESKTOP : PHONE), stageW },
  );
}

function check(got: Record<string, Box>, want: Record<string, Box>) {
  for (const [sel, b] of Object.entries(want)) {
    const g = got[sel];
    expect(Math.abs(g.x - b.x), `${sel} x`).toBeLessThanOrEqual(2);
    expect(Math.abs(g.y - b.y), `${sel} y`).toBeLessThanOrEqual(2);
    if (b.w !== undefined) expect(Math.abs(g.w! - b.w), `${sel} width`).toBeLessThanOrEqual(2);
    if (b.h !== undefined) expect(Math.abs(g.h! - b.h), `${sel} height`).toBeLessThanOrEqual(2);
  }
}

test.describe("hero geometry", () => {
  test("positions within 2px of the design", async ({ page }, info) => {
    const phone = info.project.name === "phone";
    await page.goto("/?freeze=prompt-done");
    await page.evaluate(() => document.fonts.ready);
    const { scale, boxes } = await measure(page, phone ? 390 : 1440);
    expect(scale).toBeCloseTo(1, 3);
    check(boxes, phone ? PHONE : DESKTOP);
  });

  for (const [w, h] of [
    [360, 740],
    [430, 932],
    [320, 640],
  ]) {
    test(`phone ${w}px shows the same design scaled by ${(w / 390).toFixed(3)}`, async ({ page }, info) => {
      test.skip(info.project.name !== "phone");
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/?freeze=prompt-done");
      await page.evaluate(() => document.fonts.ready);
      const { scale, boxes } = await measure(page, 390);
      expect(scale).toBeCloseTo(w / 390, 3);
      check(boxes, PHONE);
      // no horizontal page scroll
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
    });
  }

  for (const w of [1024, 1280, 1920]) {
    test(`desktop ${w}px shows the same design scaled by ${(w / 1440).toFixed(3)}`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop");
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto("/?freeze=prompt-done");
      await page.evaluate(() => document.fonts.ready);
      const { scale, boxes } = await measure(page, 1440);
      expect(scale).toBeCloseTo(w / 1440, 3);
      check(boxes, DESKTOP);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
    });
  }

  test("tablet 768px: the 390 stage at 560px, centred", async ({ page }, info) => {
    test.skip(info.project.name !== "phone");
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/?freeze=prompt-done");
    const r = await page.evaluate(() => document.querySelector("[data-hero-stage]")!.getBoundingClientRect().toJSON());
    expect(r.width).toBeCloseTo(560, 0);
    expect(r.left).toBeCloseTo((768 - 560) / 2, 0);
  });
});
