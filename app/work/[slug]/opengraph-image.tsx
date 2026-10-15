import { ogImage, OG_SIZE } from "@/lib/og";
import { getProject, getProjects } from "@/lib/content/projects";

export const alt = "Run report";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProject((await params).slug);
  return ogImage({
    kicker: p ? `RUN #${p.runId} · ${p.status === "in-production" ? "In production" : "Handed over"}` : "Run report",
    title: p?.title ?? "Run report",
    foot: p ? p.stack.join(" · ") : undefined,
  });
}
