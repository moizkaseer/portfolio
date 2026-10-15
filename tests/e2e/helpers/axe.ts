import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** All axe violations, formatted; the suite expects none. */
export async function axeViolations(page: Page, include?: string) {
  let builder = new AxeBuilder({ page });
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  return {
    violations: violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")} — ${n.failureSummary}`)),
  };
}
