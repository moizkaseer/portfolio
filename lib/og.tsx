import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/content/site";

export const OG_SIZE = { width: 1200, height: 630 };

const font = (f: string) => readFile(join(process.cwd(), "assets", "og-fonts", f));

/**
 * The site's OG image (brief §10): night shift paper, the mono header row, mega type with the
 * serif-italic phrase, the orange wire + node, and the run ID. Rendered at build time.
 */
export async function ogImage({ kicker, title, italic, foot }: { kicker: string; title: string; italic?: string; foot?: string }) {
  const [geist, mono, serif] = await Promise.all([font("Geist-SemiBold.ttf"), font("GeistMono-Regular.ttf"), font("InstrumentSerif-Italic.ttf")]);
  const ink = "#ECE9E2";
  const muted = "#8C8980";
  const line = "rgba(236,233,226,0.14)";
  const signal = "#FF4F1A";
  const long = title.length + (italic?.length ?? 0) > 34;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0C0C0B", color: ink, padding: "48px 64px", fontFamily: "Geist" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 18, borderBottom: `1px solid ${line}`, fontFamily: "Geist Mono", fontSize: 18, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 14, height: 14, background: signal }} />
            <span>{site.name}</span>
          </div>
          <span style={{ color: muted }}>{kicker}</span>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", marginRight: 36 }}>
            <div style={{ width: 64, height: 3, background: ink }} />
            <div style={{ width: 22, height: 22, background: signal, boxShadow: `0 0 0 8px rgba(255,79,26,0.2)` }} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", fontSize: long ? 78 : 104, fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 0.95, maxWidth: 940 }}>
            <span style={{ marginRight: 22, textWrap: "balance" }}>{title}</span>
            {italic && <span style={{ fontFamily: "Instrument Serif", fontWeight: 400, fontSize: long ? 86 : 116, letterSpacing: "-0.02em" }}>{italic}</span>}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 18, borderTop: `1px solid ${line}`, fontFamily: "Geist Mono", fontSize: 18, letterSpacing: "0.06em", textTransform: "uppercase", color: muted }}>
          <span>{foot ?? site.positioning}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 10, color: ink }}>
            <span style={{ width: 10, height: 10, borderRadius: 10, background: "#3DBA6F" }} />
            {site.availability.label}
          </span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Geist", data: geist, weight: 600, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
        { name: "Instrument Serif", data: serif, weight: 400, style: "italic" },
      ],
    },
  );
}
