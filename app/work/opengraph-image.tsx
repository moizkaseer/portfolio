import { ogImage, OG_SIZE } from "@/lib/og";
import { getProjects } from "@/lib/content/projects";

export const alt = "All runs";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ kicker: `${String(getProjects().length).padStart(2, "0")} runs`, title: "All", italic: "runs." });
}
