import type { MetadataRoute } from "next";
import { execFileSync } from "node:child_process";
import { getProjects } from "@/lib/content/projects";
import { abs } from "@/lib/seo";

/** When the files behind a page last changed in git (build time); undefined outside a git checkout. */
function lastChanged(...paths: string[]): Date | undefined {
  try {
    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...paths], { encoding: "utf8" }).trim();
    return iso ? new Date(iso) : undefined;
  } catch {
    return undefined;
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const projects = getProjects();
  const entry = (path: string, changeFrequency: "monthly" | "yearly", priority: number, ...files: string[]) => {
    const lastModified = lastChanged(...files);
    return { url: abs(path), changeFrequency, priority, ...(lastModified ? { lastModified } : {}) };
  };
  return [
    entry("/", "monthly", 1, "content", "components/home", "components/hero"),
    entry("/work", "monthly", 0.8, "content/projects"),
    entry("/about", "yearly", 0.6, "content/about.json", "content/toolbox.json"),
    ...projects.map((p) => entry(`/work/${p.slug}`, "yearly", 0.7, `content/projects/${p.slug}`)),
  ];
}
