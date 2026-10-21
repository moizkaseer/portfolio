import type { MetadataRoute } from "next";
import { site } from "@/lib/content/site";

/** Web app manifest (brand colors from app/styles/tokens.css §1 — the same ones the icon uses). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — ${site.positioning}`,
    short_name: site.name,
    description: site.summary,
    start_url: "/",
    display: "standalone",
    background_color: "#0C0C0B",
    theme_color: "#0C0C0B",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
