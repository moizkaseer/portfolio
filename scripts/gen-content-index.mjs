// Writes the build-time content indexes (run before `next dev` and `next build`; tests check they're in sync):
//  - lib/content/slugs.generated.json     the run slugs — proxy.ts answers 404 for anything else
//  - lib/content/projects.generated.json  title, run id, outcome, category, featured — for browser code
//    that must quote projects (the agent's demo replay) without parsing MDX
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const dir = path.join(process.cwd(), "content", "projects");
const slugs = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const projects = slugs
  .map((slug) => {
    const { data } = matter(fs.readFileSync(path.join(dir, slug, "index.mdx"), "utf8"));
    return { slug, runId: data.runId, title: data.title, outcome: data.outcome, category: data.category, featured: data.featured === true, order: data.order };
  })
  .sort((a, b) => a.order - b.order);
const out = path.join(process.cwd(), "lib", "content");
fs.writeFileSync(path.join(out, "slugs.generated.json"), JSON.stringify(slugs, null, 2) + "\n");
fs.writeFileSync(path.join(out, "projects.generated.json"), JSON.stringify(projects, null, 2) + "\n");
console.log(`content index: ${slugs.length} runs`);
