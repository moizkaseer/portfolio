import site from "@/content/site.json";
import toolbox from "@/content/toolbox.json";
import process from "@/content/process.json";
import about from "@/content/about.json";
import projects from "@/lib/content/projects.generated.json";
import { getPromptState } from "@/lib/prompt-store";
import type { ReplayContent } from "./replay-script";

/** The content the demo replay's answers are built from — the same files the site renders. */
export function replayContent(theme: "light" | "dark" = "dark"): ReplayContent {
  const p = getPromptState();
  return {
    name: site.name,
    city: site.city,
    timezone: site.timezone,
    summary: site.summary,
    availability: site.availability.label,
    about: { lead: about.lead, bio: about.bio },
    projects: projects.map((x) => ({ slug: x.slug, runId: x.runId, title: x.title, outcome: x.outcome, featured: x.featured })),
    toolbox: toolbox.groups,
    process: Object.fromEntries(process.steps.map((s) => [s.id, s.text])),
    prompt: p ? { task: p.task, nodes: p.nodes } : null,
    theme,
  };
}
