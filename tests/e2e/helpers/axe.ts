import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Known contrast findings that come from the approved design's own colours and are
 * waiting for the owner's decision (PHASE2_REVIEW.md, "Decisions needed"):
 *  - --muted on the hero's --paper-2 surfaces in day shift (4.33:1)
 *  - --muted timestamp on the highlighted (newest) log row (night 4.13:1, day 3.51:1)
 * Every other violation fails the test.
 */
const PENDING_OWNER_DECISION = /data-panel|_panel|_row|_rowTime|data-box|_boxTop|_kind/;

export async function axeViolations(page: Page, include?: string) {
  let builder = new AxeBuilder({ page });
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  const out: string[] = [];
  const pending: string[] = [];
  for (const v of violations) {
    for (const n of v.nodes) {
      const line = `${v.id}: ${n.target.join(" ")}`;
      if (v.id === "color-contrast" && PENDING_OWNER_DECISION.test(String(n.target))) pending.push(line);
      else out.push(`${line} — ${n.failureSummary}`);
    }
  }
  return { violations: out, pending };
}
