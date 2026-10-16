import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { GraphSchema, type Graph } from "@/lib/graph/schema";

const DIR = path.join(process.cwd(), "content", "projects");

const FrontmatterSchema = z.object({
  runId: z.string().regex(/^\d{3}$/),
  title: z.string(),
  outcome: z.string(),
  outcomeLong: z.string(),
  industry: z.string(),
  stack: z.array(z.string()).min(1),
  status: z.enum(["in-production", "handed-over"]),
  since: z.string(),
  year: z.string(),
  order: z.number().int(),
  placeholder: z.boolean().default(false),
  category: z.enum(["Agents", "Automations", "Tools", "Experiments"]),
  /** run report lead; *asterisks* mark the serif-italic phrase */
  lead: z.string(),
  runsLine: z.string(),
  role: z.string(),
  timeline: z.string(),
  resultsPeriod: z.string(),
  results: z.array(z.object({ value: z.string(), unit: z.string(), label: z.string() })).min(1).max(4),
});

export const TraceSchema = z.object({
  runId: z.string(),
  date: z.string(),
  durationMs: z.number().positive(),
  rows: z
    .array(z.object({ ms: z.number().min(0), t: z.string().nullable(), step: z.string(), node: z.string(), text: z.string() }))
    .min(1),
});
export type Trace = z.infer<typeof TraceSchema>;

export type ProjectMeta = z.infer<typeof FrontmatterSchema> & { slug: string; graph: Graph; trace: Trace | null; body: string };

function load(slug: string): ProjectMeta {
  const dir = path.join(DIR, slug);
  const { data, content } = matter(fs.readFileSync(path.join(dir, "index.mdx"), "utf8"));
  const meta = FrontmatterSchema.parse(data);
  const graph = GraphSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, "graph.json"), "utf8")));
  const tracePath = path.join(dir, "trace.json");
  const trace = fs.existsSync(tracePath) ? TraceSchema.parse(JSON.parse(fs.readFileSync(tracePath, "utf8"))) : null;
  if (trace) {
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const r of trace.rows) if (!ids.has(r.node)) throw new Error(`${slug}/trace.json: row "${r.step}" points at unknown node "${r.node}"`);
  }
  return { ...meta, slug, graph, trace, body: content.trim() };
}

/** Every project, in display order. Read at build time (the home page is static). */
export function getProjects(): ProjectMeta[] {
  return fs
    .readdirSync(DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => load(d.name))
    .sort((a, b) => a.order - b.order);
}

export function getProject(slug: string): ProjectMeta | undefined {
  return getProjects().find((p) => p.slug === slug);
}

/** The next run in display order (wraps around), for the "Next run" link. */
export function getNextProject(slug: string): ProjectMeta {
  const all = getProjects();
  const i = all.findIndex((p) => p.slug === slug);
  return all[(i + 1) % all.length];
}
