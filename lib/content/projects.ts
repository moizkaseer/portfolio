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
});

export type ProjectMeta = z.infer<typeof FrontmatterSchema> & { slug: string; graph: Graph; body: string };

function load(slug: string): ProjectMeta {
  const dir = path.join(DIR, slug);
  const { data, content } = matter(fs.readFileSync(path.join(dir, "index.mdx"), "utf8"));
  const meta = FrontmatterSchema.parse(data);
  const graph = GraphSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, "graph.json"), "utf8")));
  return { ...meta, slug, graph, body: content.trim() };
}

/** Every project, in display order. Read at build time (the home page is static). */
export function getProjects(): ProjectMeta[] {
  return fs
    .readdirSync(DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => load(d.name))
    .sort((a, b) => a.order - b.order);
}
