import { getProjects } from "@/lib/content/projects";
import { site } from "@/lib/content/site";
import toolbox from "@/content/toolbox.json";
import process from "@/content/process.json";
import about from "@/content/about.json";
import { abs } from "@/lib/seo";
import { statusLabel } from "@/lib/content/status";

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
    ...runs.map((p) => `- [RUN #${p.runId} ${p.title}](${abs(`/work/${p.slug}`)}): ${p.outcome} (${p.category}; ${statusLabel(p.status).toLowerCase()})`),
    "",
    "## Tools",
    "",
    ...toolbox.groups.map((g) => `- ${g.category}: ${g.tools.join(", ")}`),
    "",
    "## Contact",
    "",
    `- Email: ${site.email}`,
    ...(site.bookingUrl ? [`- Booking: ${site.bookingUrl}`] : []),
    ...site.socials.flatMap((s) => (s.url ? [`- ${s.label}: ${s.url}`] : [])),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
