# Phase 2 review — Circuit hero + "Your turn" prompt + the first stretch of the wire

Branch `phase-2-hero` (on top of `phase-1-foundation`). Paused here for the owner's review.

## What was built
- **Hero + section 02 as one fixed-coordinate stage** (`components/hero/HeroStage.tsx`, `HeroStage.module.css`): 1440 × 1840 on desktop (scaled uniformly from 1024 to 1920px wide), 390 × 1970 on phones (scaled with the screen width, max 560px on tablets). One DOM for both layouts; every coordinate, size, colour, timing and text comes from DESIGN_SPEC §3, §4, §8 and the source files.
- **Motion driven by `lib/motion/hero-motion.ts`, as-is** (byte-identical to the design's module, enforced by a test) through one pausable clock (`lib/motion/hero-controller.ts` + `components/hero/useHeroEngine.ts`). The clock runs only while the stage is on screen and the tab is visible, and resumes where it stopped.
- **Visitor takeover** exactly as the design: focus, typing, a chip, Enter or Generate stop the prompt's autoplay for good; the hero keeps looping on its own (2.4s rest, or a 1.6s restart if the hero is resting at the prompt). The visitor's builds use the `PROMPT_MS.user` timings; the instant keyword engine reads the same templates as `content/systems.json`.
- **The wire** from the screen edge through the staircase, past SHIPPED, down the right margin and into the prompt underline, with the packet hand-off (C3, first stretch).
- **Accessibility**: the h1 reads "I build agents that do the work."; tags, wires and the log are `aria-hidden`, with the log available as a visually hidden list; a labelled input; chips are buttons with `aria-pressed`; generated systems are announced via `aria-live`.
- **Reduced motion**: the finished state (step 10, template 1 built), no packet movement, no transitions; builds appear instantly.
- **`?freeze=` states** (test builds only): `hero-start`, `hero-done`, `prompt-done`, `reduced`, `t<ms>[k<n>]`, and `manual` for the clock-driven motion test.

## Fidelity check (DESIGN_SPEC §9)
Files: `docs/fidelity/phase-2/` — for each state the build screenshot, a side-by-side with the reference (`*.side-by-side.png`, reference left), and a pixelmatch diff (`*.diff.png`). Produced from a production build by `node tests/fidelity/compare.mjs`.

| State | Reference | Mismatch |
|---|---|---|
| desktop night, 0.4s | hero-night-start.png | 1.81% |
| desktop day, 0.4s | hero-day-start.png | 1.64% |
| desktop night, 17.0s | hero-night-prompt-done.png | 2.00% |
| desktop day, 17.0s | hero-day-prompt-done.png | 1.94% |
| phone night, 0.4s | hero-phone-night-start.png | 2.37% |
| phone day, 0.4s | hero-phone-day-start.png | 2.17% |
| phone night, 17.0s | hero-phone-night-prompt-done.png | 2.88% |
| phone day, 17.0s | hero-phone-day-prompt-done.png | 2.81% |

The nav strip is excluded (owner decision: the full nav wins). What the remaining mismatch is:
- **Glyph advance drift, not layout.** Long text lines end a few px apart from the reference (e.g. the 54-character prompt at 34px is ~10px wider). I verified the fonts are identical: next/font serves the same Google files, and the same string measures 816.28px with both. The reference PNGs were rasterised in a different environment.
- **Arrow glyphs (→ ↵).** No Google Fonts subset of Geist / Geist Mono contains U+2192 or U+21B5, so the design itself renders them in a system fallback font, which differs per OS. See "Decisions needed".
- **Geometry is checked directly instead**: `tests/e2e/hero-geometry.spec.ts` asserts every positioned element is within **2px** of the design coordinates at 1440 and 390, and that 320 / 360 / 430 / 768 / 1024 / 1280 / 1920 show the same design scaled, with no horizontal scroll. All pass.

## Motion test (DESIGN_SPEC §9.5)
`tests/e2e/hero-motion.spec.ts`, Playwright clock control, run at 1440 and 390:
- all four example loops, **every event** of each loop (the same event list TIMELINE.md was generated from — every typed and erased character included): lines, nodes, wires, log rows, panel label, underline, `›`, typed text, boxes (shown / border / dashed / titles), connectors and their packet, status and summary, selected chip — **all equal `deriveVisuals(stateAt(k, t))`**;
- the packet's centre after **every** move is within **1px** of `PACKET_POINTS` (desktop) / `PACKET_POINTS.mobile × scale` (phone);
- the cycle wraps to example 1 at 73,686ms.

Result: **pass** on both widths. Note from the design: steps 1, 3 and 5 hold 480ms while their move takes 500ms, so the next move starts 20ms early (< 0.1px short of the corner) — the same thing the design's interrupted CSS transition does; the test checks those stops on the last millisecond of the hold.

Also: `tests/unit/hero-motion.test.ts` (port of all 31 expectations of `hero-motion.check.js`, plus byte-identity of the module and `content/systems.json` parity) and `tests/unit/hero-controller.test.ts` (takeover, rests, user builds, reduced motion). Full suite: **18 unit + 34 e2e passing**.

## Recording
`docs/fidelity/phase-2/hero-loop-desktop.webm` (1440 × 1840) and `hero-loop-phone.webm` (390 × 1970): the full 73.7s cycle from the production build (`node tests/fidelity/record.mjs`). They are 18MB and 9MB, so they are git-ignored — share them separately. Compare with `design-reference/hero-loop.mp4` / `hero-phone-loop.mp4`.

## Frame rate
`node tests/fidelity/fps.mjs` — rAF intervals over 20s of the running loop, headless Chromium:

| Viewport | CPU | Avg FPS | p95 frame | Frames > 20ms | Long tasks |
|---|---|---|---|---|---|
| 1440 | 1× | 60.0 | 16.7ms | 0.00% | 0 |
| 1440 | 4× throttled | 60.0 | 16.8ms | 0.00% | 0 |
| 390 | 1× | 60.0 | 16.7ms | 0.00% | 0 |
| 390 | 4× throttled | 60.0 | 16.8ms | 0.08% | 0 |

Only `transform`, `opacity`, colours and borders animate; the packet is one `transform` per frame; React re-renders only when the discrete state changes.

## Lighthouse (mobile, production build)
Performance 92 · Accessibility 96 · Best Practices 100 · SEO 100. FCP 1.1s, **LCP 2.0s**, CLS 0.002, TBT 320ms. Accessibility < 100 only because of the contrast items below.

## Decisions needed from the owner
1. **Colour contrast in the approved design (WCAG AA).** Kept exactly as designed until you decide:
   - day shift: `--muted` #6A675F on the hero's `--paper-2` #E5E1D8 is **4.33:1** (log timestamps, panel label, prompt box labels). Proposal: `#64615A` on raised surfaces (4.73:1), visually almost identical.
   - the newest log row's timestamp: `--muted` on the orange highlight is **4.13:1** (night) / **3.51:1** (day). Proposal: use `--ink-2` for that one timestamp (6.8:1 / 7.1:1).
   The axe tests list exactly these findings as "pending owner decision" and fail on anything else.
2. **Initial JS budget.** The brief asks for ≤ 150KB gzipped; an empty Next.js 16.4 app already ships **176KB**. This page ships **183KB** (GSAP, Lenis and zod were moved out of the initial load). Accept the framework baseline, or decide what to trade.
3. **LCP element on phones** is the sub-line paragraph, not the headline: at 50px the staircase lines are separate small blocks, and the paragraph is the largest text block on the first screen (desktop is fine). It's an effect of the approved phone design; LCP time is still 2.0s.
4. **Arrow glyphs** (→ in buttons and chips, ↵ in Generate) come from the visitor's system font because Google's Geist subsets don't include them — as in the design. Options: keep, or self-host the full Geist files from Vercel's `geist` package so every OS shows Geist's own arrows (would differ slightly from the reference screenshots).
5. **C3 hand-off timing.** The brief (C3) says the hero → prompt hand-off waits until the prompt is in view; DESIGN_SPEC §4/§10 and the brief's §5 say the loop runs whenever either section is visible. On a 1440 × 900 screen the prompt is below the fold, so waiting would stop the loop at step 8 for anyone who doesn't scroll. I followed the design (loop pauses only when both are off-screen). Say if you want the C3 behaviour instead.

## Other notes (decisions taken, per brief §12 "choose the more restrained option")
- **Nav**: fixed, on the page background (no `mix-blend-mode: difference`) so it looks exactly like the design at the top of the page; the design wins on look.
- **Footer bottom row**: the design's four items (the brief's extra "local time" and "Last deployed" are not in the design; build date is available as `BUILD_DATE` for the curl version).
- **"Booked" LED colour** (amber) is not in the design; `#E0A526` is a placeholder and unused while the status is "available".
- **Packet easing**: evaluated with an exact CSS cubic-bezier solver instead of GSAP's CustomEase, so GSAP stays out of the initial bundle; the packet is driven by the same pausable clock as everything else (deterministic, resumes exactly).
- `/about` links are not prefetched until the page exists (Phase 7), to keep the console free of 404s.
- Below 1024px the stage keeps the phone design up to 560px wide and centres it; the nav keeps 16px side margins.
- Live time uses UTC until a timezone is set in `content/site.json`.

## Still `[TODO]` (owner content)
Everything in AUDIT.md §6: name, city + timezone, email, domain, booking link, socials, the two hero stat numbers, projects.
