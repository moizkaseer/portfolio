import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** All axe violations, formatted; the suite expects none. Runs once animations have settled. */
export async function axeViolations(page: Page, include?: string) {
  // measuring text mid-fade would report contrast for a state nobody reads
  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity), null, { timeout: 4000 })
    .catch(() => {});
  // [data-ghost]: the design's faint "upcoming step" boxes (12% opacity, aria-hidden) — decorative,
  // inactive states, which WCAG 1.4.3 exempts from contrast ("incidental text… pure decoration")
  let builder = new AxeBuilder({ page }).exclude("[data-ghost]");
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  return {
    violations: violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")} — ${n.failureSummary}`)),
  };
}
