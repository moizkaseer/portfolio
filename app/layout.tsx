import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { Instrument_Serif } from "next/font/google";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/footer/Footer";
import { SmoothScroll } from "@/lib/motion/SmoothScroll";
import { CommandPaletteLauncher } from "@/components/palette/CommandPaletteLauncher";
import { site } from "@/lib/content/site";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { agentConfigured } from "@/lib/server/agent-model";
import { pageMetadata, siteUrl } from "@/lib/seo";
import { AskBar } from "@/components/home/AskBar";
import { Deferred } from "@/components/Deferred";
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
  // preloaded (Phase 7): mono is above the fold on every page (nav, hero log), so it no longer
  // swaps in late; the fallback metrics are a monospace font's, not Arial's
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
  adjustFontFallback: false,
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
  metadataBase: new URL(siteUrl()),
  title: { default: `${site.name} — ${site.positioning}`, template: `%s — ${site.name}` },
  ...pageMetadata({ description: `${site.summary} Based in ${site.city}, North Macedonia; working remotely.`, path: "/" }),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0C0C0B" },
    { media: "(prefers-color-scheme: light)", color: "#0C0C0B" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const initialAgentMode = agentConfigured() ? "live" : "demo";
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* for developers who open the console (brief C4); inline, so it isn't in the JS budget */}
        <script
          dangerouslySetInnerHTML={{
            __html: `console.info("%c■ ${site.name.replace(/["\\]/g, "")}%c — this site has a terminal version:  curl -L ${site.domain.replace(/["\\]/g, "")}", "color:#FF4F1A;font-weight:600", "color:inherit");`,
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        <SmoothScroll />
        <Deferred name="idle" />
        <aside aria-label="Agent">
          {/* desktop: the floating "Ask the agent" pill (brief §5); phones use the bottom bar */}
          <Link href="/#agent" className="agent-pill" data-agent-open>
            <span aria-hidden="true" />
            Ask the agent
            <kbd>⌘K</kbd>
          </Link>
          <AskBar initialMode={initialAgentMode} />
        </aside>
        <CommandPaletteLauncher email={site.email} agentMode={initialAgentMode} />
      </body>
    </html>
  );
}
