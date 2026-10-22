/**
 * Prints every demo replay answer with the current content (for docs/PHASE6_REVIEW.md).
 * Run: GEN_ANSWERS=out.md npx vitest run tests/unit/answers.gen.test.ts
 */
import fs from "node:fs";
import { it } from "vitest";
import site from "@/content/site.json";
import toolbox from "@/content/toolbox.json";
import process from "@/content/process.json";
import about from "@/content/about.json";
import projects from "@/lib/content/projects.generated.json";
import { FALLBACK, PRICE, REPLAYS, type ReplayContent } from "@/lib/agent/replay-script";

it.runIf(!!globalThis.process.env.GEN_ANSWERS)("prints the demo answers", () => {
  const base: ReplayContent = {
    name: site.name,
    city: site.city,
    timezone: site.timezone,
    summary: site.summary,
    availability: site.availability.label,
    about: { lead: about.lead, bio: about.bio },
    projects: projects.map((p) => ({ slug: p.slug, runId: p.runId, title: p.title, outcome: p.outcome, featured: p.featured })),
    toolbox: toolbox.groups,
    process: Object.fromEntries(process.steps.map((s) => [s.id, s.text])),
    prompt: null,
    theme: "dark",
  };
  const withPrompt: ReplayContent = { ...base, prompt: { task: "Every Monday, send a KPI summary to Slack", nodes: [["Schedule", "Monday 09:00"], ["Tool", "Pull the metrics"], ["Model", "Write the summary"], ["Code", "Sanity-check numbers"], ["Tool", "Post to #ops"]].map(([kind, title]) => ({ kind, title })) } };
  const out: string[] = [];
  const show = (id: string, c: ReplayContent, note = "") => {
    const r = [...REPLAYS, PRICE, FALLBACK].find((x) => x.id === id)!;
    const steps = r.steps(c);
    out.push(`### ${id}${note}`, "", `Triggered by: \`${r.match.source}\``, "");
    for (const s of steps) {
      if (s.kind === "tool") out.push(`- trace: \`${s.label}\` · ${s.meta}`);
      if (s.kind === "ui") out.push(`- action: \`${s.tool}(${JSON.stringify(s.input)})\``);
      if (s.kind === "text") out.push("", `> ${s.text}`, "");
    }
    out.push("");
  };
  for (const r of REPLAYS) {
    if (r.id === "your-system") {
      show(r.id, base, " — before the visitor builds anything");
      show(r.id, withPrompt, " — after building the “Monday KPI report” example");
    } else if (r.id === "theme") {
      show(r.id, base, " — from night shift");
      show(r.id, { ...base, theme: "light" }, " — from day shift");
    } else show(r.id, base);
  }
  show("price", base);
  show("fallback", base);
  fs.writeFileSync(globalThis.process.env.GEN_ANSWERS!, out.join("\n"));
});
