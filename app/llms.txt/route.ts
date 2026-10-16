import { getProjects } from "@/lib/content/projects";
import { site } from "@/lib/content/site";
import toolbox from "@/content/toolbox.json";
import process from "@/content/process.json";
import about from "@/content/about.json";
import { abs } from "@/lib/seo";

/** /llms.txt — a plain summary for AI assistants (brief §10), from the content files. */
export function GET() {
  const runs = getProjects();
  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.summary}`,
    "",
    `${site.positioning}. Based in ${site.city}. ${site.availability.label}.`,
    "",
    "## About",
    "",
    about.lead,
    "",
    ...about.bio,
    "",
    `More: ${abs("/about")} · plain text: curl ${site.domain}`,
    "",
    "## How the work is done",
    "",
    ...process.steps.map((s) => `- ${s.title}: ${s.text}`),
    "",
    "## Runs (case studies)",
    "",
    `All runs: ${abs("/work")}`,
    "",
    ...runs.map((p) => `- [RUN #${p.runId} ${p.title}](${abs(`/work/${p.slug}`)}): ${p.outcome} (${p.category}; ${p.status === "in-production" ? "in production" : "handed over"})`),
    "",
    "## Tools",
    "",
    ...toolbox.groups.map((g) => `- ${g.category}: ${g.tools.join(", ")}`),
    "",
    "## Contact",
    "",
    `- Email: ${site.email}`,
    `- Booking: ${site.bookingUrl ?? "[booking link]"}`,
    ...site.socials.map((s) => `- ${s.label}: ${s.url ?? "[link]"}`),
    "",
    "Values in [square brackets] are placeholders the owner hasn't filled in yet.",
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
