import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { getProject, getProjects } from "@/lib/content/projects";
import { site } from "@/lib/content/site";
import toolbox from "@/content/toolbox.json";
import { SECTIONS } from "@/lib/agent/protocol";

const slugs = () => getProjects().map((p) => p.slug);

/** Read-only server tools over /content (brief §7). They never send or change anything. */
export function serverTools() {
  return {
    search_projects: tool({
      description:
        "Search the owner's projects (runs). Returns slug, run id, title, one-line outcome, category, stack and status. Order is the owner's own ranking (sort: 'impact' keeps it).",
      inputSchema: z.object({
        query: z.string().max(200).optional().describe("words to match; omit to list all"),
        sort: z.enum(["impact", "recent"]).optional(),
      }),
      execute: async ({ query, sort }) => {
        const q = (query ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 2);
        let list = getProjects().filter((p) => {
          if (!q.length) return true;
          const hay = [p.title, p.outcome, p.category, p.industry, ...p.stack, ...p.graph.nodes.map((n) => n.label)].join(" ").toLowerCase();
          return q.some((w) => hay.includes(w));
        });
        if (sort === "recent") list = [...list].sort((a, b) => b.year.localeCompare(a.year));
        return list.map((p) => ({ slug: p.slug, runId: `#${p.runId}`, title: p.title, outcome: p.outcome, category: p.category, stack: p.stack, status: p.status, placeholder: p.placeholder }));
      },
    }),
    get_case_study: tool({
      description: "Full run report for one project: facts, results, the system's steps (graph) and the written case study.",
      inputSchema: z.object({ slug: z.string().describe("a slug from search_projects") }),
      execute: async ({ slug }) => {
        const p = getProject(slug);
        if (!p) return { error: `no project "${slug}"`, known: slugs() };
        return {
          slug: p.slug,
          runId: `#${p.runId}`,
          title: p.title,
          lead: p.lead,
          client: p.industry,
          role: p.role,
          timeline: p.timeline,
          stack: p.stack,
          status: p.status,
          results: p.results,
          steps: p.graph.nodes.map((n) => ({ step: n.label, kind: n.kind })),
          branches: p.graph.edges.filter((e) => e.length === 3).map(([from, to, when]) => ({ from, to, when })),
          caseStudy: p.body,
          placeholder: p.placeholder,
        };
      },
    }),
    get_toolbox: tool({
      description: "The tools the owner works with, grouped by category.",
      inputSchema: z.object({}),
      execute: async () => toolbox.groups,
    }),
    get_availability: tool({
      description: "Whether the owner is taking projects, and how to reach them.",
      inputSchema: z.object({}),
      execute: async () => ({ status: site.availability.label, email: site.email, booking: site.bookingUrl ?? "not set yet" }),
    }),
    draft_intro_email: tool({
      description:
        "Draft a short intro email the VISITOR can copy into the contact form. It returns text only — it never sends anything.",
      inputSchema: z.object({ summary: z.string().max(1000).describe("the visitor's task in their words") }),
      execute: async ({ summary }) => ({
        draft: `Hi ${site.name},\n\nWe'd like to automate this: ${summary.trim()}\n\nCould we talk about what a first version would look like?\n\nThanks`,
        note: "Not sent. The visitor can paste it into the contact form or use ui_prefill_contact.",
      }),
    }),
  };
}

/** UI tools: no execute — the browser runs them (validated against the allow-list) and returns the result. */
export function uiTools() {
  return {
    ui_scroll_to: tool({ description: "Scroll the visitor's page to a home-page section.", inputSchema: z.object({ section: z.enum(SECTIONS) }) }),
    ui_highlight_project: tool({ description: "Highlight a project's row on the home page.", inputSchema: z.object({ slug: z.string() }) }),
    ui_open_project: tool({ description: "Open a project's run report page.", inputSchema: z.object({ slug: z.string() }) }),
    ui_set_theme: tool({ description: "Switch the site between day shift (light) and night shift (dark).", inputSchema: z.object({ theme: z.enum(["light", "dark"]) }) }),
    ui_highlight_tools: tool({ description: "Scroll to the toolbox and highlight tools by their exact names from get_toolbox.", inputSchema: z.object({ names: z.array(z.string()).min(1).max(8) }) }),
    ui_prefill_contact: tool({
      description: "Fill the contact form's 'What should be automated?' field for the visitor. It never submits the form.",
      inputSchema: z.object({ summary: z.string().max(2000) }),
    }),
  };
}

export function systemPrompt() {
  return `You are the agent on ${site.name}'s portfolio site. ${site.name} designs, builds and runs AI agents and automations.

Rules:
- Answer only from tool results about ${site.name}'s work. If the tools don't contain the answer, say: "I don't know — ask ${site.name} directly." Never invent clients, numbers, prices, dates or availability.
- Values in [square brackets] are placeholders the owner hasn't filled in yet: say so plainly instead of presenting them as facts.
- Keep answers short: two to four sentences, plain language. You are the site's agent ("I"); talk about ${site.name} in the third person.
- English by default; reply in the visitor's language if they write in another one.
- You can act on the page with the ui_* tools, at most 3 per turn: scroll to a section, highlight or open a project, switch the theme, highlight tools, or prefill the contact form. Say what you did. You can never submit a form, send an email or leave the site.
- If the visitor takes control back (a ui tool result says "cancelled"), stop acting and just answer.`;
}
