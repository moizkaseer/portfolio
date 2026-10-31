import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const DIR = path.join(process.cwd(), "content", "blog");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WORDS_PER_MINUTE = 200;

const FrontmatterSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  description: z.string().min(1).max(160),
  date: z.string().regex(DATE_RE),
  updated: z.string().regex(DATE_RE).optional(),
  tags: z.array(z.string().min(1)).min(1),
});

export type BlogPostMeta = z.infer<typeof FrontmatterSchema> & { body: string; readingTime: number };

function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function load(file: string): BlogPostMeta {
  const { data, content } = matter(fs.readFileSync(path.join(DIR, file), "utf8"));
  const meta = FrontmatterSchema.parse(data);
  const slugFromFile = file.replace(/\.mdx$/, "");
  if (meta.slug !== slugFromFile) {
    throw new Error(`content/blog/${file}: frontmatter slug "${meta.slug}" does not match filename "${slugFromFile}"`);
  }
  const body = content.trim();
  return { ...meta, body, readingTime: readingTime(body) };
}

/** Every post, newest first. Read at build time (post pages are static). */
export function getPosts(): BlogPostMeta[] {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map(load)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getPost(slug: string): BlogPostMeta | undefined {
  return getPosts().find((p) => p.slug === slug);
}
