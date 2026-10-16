import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/content/projects";
import { abs } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: abs("/"), changeFrequency: "monthly", priority: 1 },
    { url: abs("/work"), changeFrequency: "monthly", priority: 0.8 },
    { url: abs("/about"), changeFrequency: "yearly", priority: 0.6 },
    ...getProjects().map((p) => ({ url: abs(`/work/${p.slug}`), changeFrequency: "yearly" as const, priority: 0.7 })),
  ];
}
