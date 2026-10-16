import { ogImage, OG_SIZE } from "@/lib/og";
import { site } from "@/lib/content/site";

export const alt = `${site.name} — I build agents that do the work.`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ kicker: "01 — Index", title: "I build agents that do", italic: "the work." });
}
