import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** apple-touch-icon: the same signal square as app/icon.svg, on an opaque --paper background (iOS fills transparency with white otherwise). */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0C0C0B" }}>
        <div style={{ width: "67.5%", height: "67.5%", background: "#FF4F1A" }} />
      </div>
    ),
    { ...size },
  );
}
