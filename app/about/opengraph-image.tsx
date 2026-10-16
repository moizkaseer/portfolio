import { ogImage, OG_SIZE } from "@/lib/og";
import { site } from "@/lib/content/site";

export const alt = `About ${site.name}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ kicker: "About", title: site.name, italic: "at work." });
}
