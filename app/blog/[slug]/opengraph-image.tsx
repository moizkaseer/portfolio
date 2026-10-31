import { ogImage, OG_SIZE } from "@/lib/og";
import { getPost, getPosts } from "@/lib/content/blog";

export const alt = "Blog post";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const p = getPost((await params).slug);
  return ogImage({
    kicker: p ? `Blog · ${p.readingTime} min read` : "Blog",
    title: p?.title ?? "Blog post",
    foot: p?.tags.join(" · "),
  });
}
