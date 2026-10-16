import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Instrument_Serif } from "next/font/google";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/footer/Footer";
import { SmoothScroll } from "@/lib/motion/SmoothScroll";
import { GridOverlay } from "@/components/grid/GridOverlay";
import { CommandPaletteLauncher } from "@/components/palette/CommandPaletteLauncher";
import { site } from "@/lib/content/site";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Vercel's Geist files (`geist` package, OFL) subset to Latin + arrows by scripts/subset-fonts.sh
// (owner decision, 2026-10-15): unlike Google's subsets they include → and ↵, so arrows look the same on every OS.
const geist = localFont({
  src: "./fonts/Geist-Variable.subset.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.subset.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: false,
});

// The italic phrase is part of the hero headline (the LCP element), so it is preloaded too.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${site.name} — AI agents & automation`,
  description:
    "I design, build and run AI agents and automations for teams that are done doing the same work twice.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0C0C0B" },
    { media: "(prefers-color-scheme: light)", color: "#0C0C0B" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        <SmoothScroll />
        <GridOverlay />
        <CommandPaletteLauncher email={site.email} />
      </body>
    </html>
  );
}
