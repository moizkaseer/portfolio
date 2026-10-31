import { ogImage, OG_SIZE } from "@/lib/og";
import { getPosts } from "@/lib/content/blog";

export const alt = "Blog";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ kicker: `${String(getPosts().length).padStart(2, "0")} posts`, title: "Notes on building", italic: "agents." });
}
