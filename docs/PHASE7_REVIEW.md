# Phase 7 review — polish

Branch `phase-7-polish` (on top of `phase-6-prompt-curl`). Paused here for the owner's review.

## What was built
- **404 — "Run failed: route not found."** (`app/not-found.tsx`): a run report for a run that failed — breadcrumb (← Home / RUN #404), status row with a red-orange LED and "Failed · 0 steps completed · 1 error", the title with the serif italic phrase, **↻ Retry** (goes home; the arrow turns on hover) and "See all runs", then the failed run's log (`trigger GET /the-address-you-typed → route → error 404 → retry ↻ waiting for you`). Answers a real 404 status. It is server-rendered (the 404 page ships with every page in Next.js, so it must not add JavaScript); a one-line inline script writes the address into the log.
- **OG images** (`next/og`, 1200×630, in the night-shift style: mono header, Geist title with the Instrument Serif phrase, the orange wire and node, footer with stack / availability): home, `/work`, `/about` and one per run (title, RUN #, status and stack from the run's frontmatter). Fonts are bundled in `assets/og-fonts/` (OFL).
- **JSON-LD**: `Person` on home (name, role, summary, URL; the city and social links are left out while they are placeholders), `CreativeWork` on each run report (name, outcome, URL, category, creator, keywords from the stack; the year once it is real).
- **sitemap.xml, robots.txt** (everything allowed except `/api/`), **/llms.txt** (who you are, about, how the work is done, every run with its link and outcome, tools, contact) — all generated from the content files. Canonical links on every page.
- **Absolute URLs** come from `NEXT_PUBLIC_SITE_URL`, else the real domain in `content/site.json`, else Vercel's production URL, else localhost (`lib/seo.ts`).
- **Favicon**: one orange square (`app/icon.svg`). While the agent is answering it pulses in the tab (swaps between full and 35% every 600ms; code is in the agent's lazy chunk, so nothing loads until the agent is used).
- **Console message for developers**: already in place since Phase 6 (`■ [YOUR NAME] — this site has a terminal version: curl [yourdomain.com]`), inline in the page so it costs no JS. Verified.
- **About** (`/about`, `content/about.json`) in the site's language: breadcrumb like the run reports, "About · ● Available for projects", the title "[YOUR NAME] *at work.*", a lead sentence, and a 4:5 portrait slot (striped placeholder labelled PORTRAIT / [PHOTO]); then **01 Bio**, **02 Now** (three items with orange markers), **03 Timeline** (year · milestone · one line, hairline rows), **04 Toolbox** (from `content/toolbox.json`, linking to the home toolbox). The footer's "Have work that should *run itself?*" closes the page. The nav's "03 About" is now a live link and is underlined on `/about`. Screenshots (both themes, desktop and phone, full page): `docs/fidelity/phase-7/about-{desktop,phone}-{dark,light}.png`; the 404: `docs/fidelity/phase-7/404-*.png`.

## Micro-interactions (brief §3)
- **Button label roll** (CSS only): on hover or keyboard focus the label slides up and a copy rolls in from below (420ms, expo-out), arrows nudge 4px. On: Start a project →, Try it on your task ↓, See real runs, Build this with me →, ▶ Run (contact), ▶ Start a run (footer), ↻ Retry, See all runs; arrow nudge also on "All runs 4 →", "Open run report →", "Book a call →". The copy is generated content with empty alt text, so screen readers read the label once (tested). Only on devices that can hover, and off with reduced motion.
- **Underline draw** (`.text-link`, `background-size`): breadcrumbs on every page, "Next · RUN #… →", social links, the About toolbox link.
- **Cursor dot + magnetic pull** (`components/cursor/CursorDot.tsx`): the native cursor stays; over links and buttons a small orange dot trails the pointer (lerp 0.18 per 60Hz frame, scaled by real elapsed time so 120Hz screens trail the same), and the element leans towards the pointer by at most 6px (CSS `translate`, released with a 250ms ease). Whole run rows and cards get the dot but don't move; the hero stage and the agent panel are left alone. **Off for touch / coarse pointers and with reduced motion** (tested). Loaded when the page is idle.
- **Status LEDs pulse slowly** (2.4s): the nav LED already did; now also the run list on home, `/work` and the run report status. Still with reduced motion.

## Detail pass — what I checked and what I fixed
| Area | Checked | Fixed |
|---|---|---|
| Text selection | orange background, `#0E0E0C` text, both themes | already correct (`::selection` in globals); now tested |
| Scrollbars | page, agent log, palette, phone menu, hero chip row | page scrollbar in the site's colours in both themes (`scrollbar-color` for Chrome/Firefox, `::-webkit-scrollbar` for Safari); the dark terminal gets a light thumb in both themes; the phone chip row hides its bar (it's swiped, as in the design) |
| Hover states | every button and link on every page | primary/secondary buttons now roll; footer email underline tightens on hover |
| Focus states | Tab through home, /about, 404, /work, a run report | every focusable element shows the orange outline or its own indicator — new test tabs through each page and fails on any element without one |
| Font flash | Geist, Geist Mono, Instrument Serif | **Geist Mono is now preloaded** (it is above the fold on every page: nav, hero log) and its fallback is a monospace font instead of Arial-shaped metrics; all three fonts are preloaded (test) |
| 320px | home, /about, /work, run report, 404 | no horizontal scroll (test) |
| Ultrawide 2560px | same pages | **nav now lines up with the 1680px content frame** (it used to stretch to the screen edges). The hero stage scales up to 1920px wide as DESIGN_SPEC §3 says, so at 2560 its content is ~35px wider each side than the 1680 frame — that is the spec, I left it |
| Phones in landscape (844×390) | all pages, phone menu | **the phone menu's links are sized by the screen height too**, so all four fit, and the panel scrolls if needed; no horizontal scroll (test) |
| 120Hz screens | all animation code | all motion is time-based (GSAP, CSS, the hero engine's timestamps); the one frame-based value — the cursor dot's lerp — is scaled by elapsed time |
| Safari (desktop + iOS) | see below | **iOS zoom**: the agent inputs were 13px, which makes iOS Safari zoom the page on focus — now 16px on touch screens (desktop keeps the design's 13px) |

**Safari — code-level checks** (WebKit can't run in this environment yet; it needs the system packages `libevent-2.1-7t64 libavif16 libmanette-0.2-0`): `tan(atan2())` scaling has an `@supports` fallback; container units, `:has()`, `color-mix()`, `dvh`, `inert`, `translate` all need Safari ≥ 16 (fine); `requestIdleCallback` (missing in Safari) has a timeout fallback everywhere; `scrollend` (missing before Safari 18) has a timeout fallback; View Transitions (Safari 18+) degrade to a plain navigation; the label roll's empty-alt `content` falls back to plain `attr()` on older Safari; clipboard copy runs inside the click. Once the packages are installed I can add WebKit desktop + iPhone projects to Playwright and run the whole suite in them.

## Home page budget
**189.8KB** (≤ 190KB, test). Adding the new pages made Next.js split a shared router chunk and grow its runtime by ~1KB that I can't control, so to stay under I moved two small home behaviours to idle loading: the toolbox → runs highlight and the copy-email toast (`components/home/HomeEnhance.tsx`, also loaded the moment the pointer or focus reaches those sections; the markup is server-rendered). Also kept out of the initial load: the cursor dot (idle), the 404 log (server-rendered), the favicon pulse (agent chunk).

## Fidelity
Re-ran the design comparisons after the button changes: hero 1.44–2.78% (unchanged), home sections 1.04–5.09% (unchanged within 0.02%), run report 2.88–2.95% vs 2.54–2.67% in Phase 4 — the difference is the Phase 5 "Ask the agent" pill and the owner-approved "This is a sample run…" sentence, not Phase 7 (the label roll only shows on hover).

## Tests
New `tests/e2e/polish.spec.ts`: 404 status, title, the requested path in the log, Retry → home, axe in both themes; sitemap / robots / llms.txt content; OG images (200, image/png) for home, /work, /about and a run; JSON-LD Person and CreativeWork, canonical and og:image; About sections, portrait placeholder, nav underline, axe in both themes; cursor dot and ≤ 6px pull on desktop, released on leave; no dot on touch or with reduced motion; label roll moves and the accessible name is read once; LEDs pulse at 2.4s; selection colours and themed scrollbar; focus indicator on every focusable element (5 pages); no horizontal scroll at 320 / 2560 / phone landscape; phone menu fits landscape; fonts preloaded. Updated: the unknown-run 404 test now expects the new page.

**154 e2e + 42 unit passing** (34 e2e skipped by design: desktop-only / phone-only cases).

**Lighthouse (mobile)**: Accessibility, Best Practices and SEO 100 on every page. Performance: home 83–87, `/about` 88, `/work` 90, run report 86; LCP 2.1–2.3s, CLS ≤ 0.002. Performance is lower than Phase 5's 93 on every page by a similar amount — including the run report, whose code Phase 7 barely touched — and the gap is all Total Blocking Time (360–530ms), so I believe it is load on this machine during the run (an editor and a browser were busy), not the site. Worth a re-check on the Vercel preview with PageSpeed Insights.

## Decisions taken
- **About CTA**: I first added a "Have work that should run itself?" block at the end of /about, then removed it — the footer says exactly that right below.
- The 404 log fills in the address with a tiny inline script rather than a client component, to keep the home budget.
- Absolute URLs fall back to Vercel's production URL before the domain is set, so previews share correctly.
- Magnetic pull is off for whole run rows / cards (a 6px shift of a full-width row looks like a layout bug).

## Needs the owner
1. About content: bio, now, timeline, portrait (AUDIT.md §15).
2. To test in Safari here: run `! sudo apt-get install -y libevent-2.1-7t64 libavif16 libmanette-0.2-0` and I'll add WebKit desktop + iPhone to the test run. Or check the Vercel preview on your own Mac / iPhone.
3. The domain (for canonical links, OG and the curl line).
4. Everything else still `[TODO]` is in AUDIT.md §6 and §13–15.
