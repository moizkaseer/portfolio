# Phase 3 review — Home sections + the C3 rail

Branch `phase-3-home` (on top of `phase-2-hero`). Paused here for the owner's review.

## What was built (home, top to bottom)
| # | Section | Source | Notes |
|---|---|---|---|
| 01–02 | Hero + Your turn | Phase 2 | "Build this with me →" now prefills the contact form (task + generated steps, JSON attached) |
| 03 | How I work (manifesto) | Main.html | Line reveal on enter (SplitText, masked, expo.out, loaded lazily); the last sentence turns `--muted` → `--ink` word by word as it passes the viewport centre |
| 04 | Selected runs | Main.html (desktop), Mobile.html (phone) | The four placeholder projects from the design. Desktop: hover (120ms intent) or keyboard focus opens a row into the design's highlighted layout; rows below slide (FLIP, transform only); the media clips in from the edge; the mini trace (from `graph.json`) plays once. Phone: stacked cards, the featured run first with media + trace, which plays when the card reaches the centre |
| 05 | Process | not in the design (DESIGN_SPEC §7) | Desktop: pinned with CSS `position: sticky` for 1.5 viewport heights (brief: ≤ 2.5); the diagram builds step by step, title + explanation on the left, run log on the right. Phones / reduced motion / no-JS: the stacked list (also the accessible version) |
| 06 | Talk to my agent | Main.html | As designed, with the design's example session. Chips, input and Send are visibly disabled until Phase 5 connects the live agent |
| 07 | Toolbox | not in the design | Dense mono table, category → tools; each tool lists the runs that use it and highlights them in 04 on hover/focus |
| 08 | Contact | not in the design | "Start a run": the form as a workflow trigger (01 What should be automated? / 02 Where does it happen today? / 03 Email), `▶ Run`, then the trace `received → parsed → queued for [YOUR NAME]`. Email click copies with the toast "Copied — talk soon". Booking link `[TODO]` |
| — | Footer | Main.html | The wordmark rises in with a slow scrub as you reach the bottom |
| — | Phone "Ask the agent" bar | Mobile.html | Fixed at the bottom on phones; until Phase 5 it scrolls to section 06 |

**C3 rail**: from the corner where the hero's wire turns into the prompt underline, the rail continues down the right margin (phones: 8px from the right edge), drawn in `--line-strong` and inked in as you scroll, with one packet marking where you are. Every section header gets a tick (ink once the rail reaches it); the open run row gets a `--signal` branch. One SVG; anchors are re-measured on resize. Reduced motion / freeze: fully drawn, no packet.

**Contact backend** (`app/api/contact/route.ts`): zod validation on the server, honeypot (silently accepted), per-IP rate limit 5/hour (Upstash Redis when configured, in-memory otherwise), delivery via Resend. Without `RESEND_API_KEY` + `CONTACT_TO_EMAIL`, dev logs the message and production answers **503** with your email address — nothing is silently lost. See `.env.example`.

**Content**: `content/projects/<slug>/index.mdx` (frontmatter validated with zod) + `graph.json` for the design's four placeholder projects, every value bracketed. `content/process.json` (draft copy — see below), `content/toolbox.json` (the design's bracketed stack names as placeholders, so the cross-link already works).

## Fidelity (DESIGN_SPEC §9)
`node tests/fidelity/compare-home.mjs` aligns each design section by its header hairline (the reference still has the old graph hero) and diffs it, `?freeze=home-hover`, 1440 wide. Images: `docs/fidelity/phase-3/` (side-by-side: reference left, build right; diffs).

| Section | Day | Night |
|---|---|---|
| Manifesto | 2.34% | 2.34% |
| Selected runs (RUN #011 highlighted by the agent) | 4.13% | 4.02% |
| Talk to my agent | 5.08% | 5.04% |
| Footer | 1.05% | 1.07% |

What the remaining mismatch is:
- **Section numbers** follow the brief's order (03 How I work, 04 Selected runs, 06 Talk to my agent; meta `03 / 08`) instead of the design's 02 / 03 / 05 — as agreed.
- **The C3 rail and its ticks** along the right margin (not drawn in the reference).
- **Text rasterisation / font build**: Vercel's Geist renders a few lines ~1% wider than the reference's Google build. In one place this changed a line break (06's lead pushed "for." to a third line and moved the chips 25px); that paragraph uses `43ch` instead of `42ch` to keep the design's two lines. Everything else keeps the design's values.
- **The placeholder media box's diagonal stripes** land a fraction of a pixel out of phase (the whole box shows up in the diff).
- Hero comparison re-run with the rail in place: 1.27–2.69% (Phase 2 numbers + the rail continuing below the prompt corner).

**Sections not in the design** (screenshots for your review, both themes, desktop and phone): `docs/fidelity/phase-3/new-sections/` — Process at steps 1, 3, 5; Toolbox; Contact.

## Tests
`tests/e2e/home.spec.ts` (+ the Phase 1–2 suites): section order and numbering; no horizontal scroll at 320–1920; axe on the **whole page** in both themes (0 violations); row hover / keyboard focus / trace plays to the end; freeze `home-hover` matches the design state; phone cards; toolbox → runs cross-link; "Build this with me" prefill; contact validation and success trace; API 422 / honeypot / 503 / 429; copy-email toast; Process advances with scroll (desktop) and stacks (phone); rail starts exactly at the hero's corner (< 1px), draws with scroll, is fully drawn under reduced motion. `tests/unit/content.test.ts`: every project's frontmatter + `graph.json`, and the mini-trace path rules.

**59 e2e + 25 unit, all passing.**

## Performance
- Initial JS: **190KB gz — exactly at the new budget.** Phase 3 added ~7KB of interactive code (run list, rail, process, contact form). GSAP + SplitText + Lenis load only after idle / near the manifesto; zod stays on the server. Anything added in Phases 4–7 will need to be lazy-loaded or offset.
- Lighthouse mobile: Performance 89–92, **Accessibility 100, Best Practices 100, SEO 100**; LCP 2.0s, CLS 0.002.
- Scrolling the whole page with 4× CPU throttling: **59–60 fps**, p95 frame 16.8ms, < 1% frames over 20ms (desktop and phone). The rail updates its SVG directly and only re-renders when a tick lights up.

## Decisions taken (brief §12: the more restrained / faster option)
- **Pinning and the rail use CSS `sticky` and plain scroll maths, not ScrollTrigger / MotionPath**: same behaviour, nothing to load before the visitor scrolls, no pin-spacer layout shift. GSAP is still used where it adds something (SplitText reveals, Lenis' ticker).
- **Design defaults over Tailwind defaults**: page line-height `normal` and normal paragraph wrapping (the design never sets `text-wrap: pretty`); `pretty` is kept only in the sections the design doesn't cover. This fixed several line-height and wrapping differences.
- **Contact vs footer**: the footer keeps the design's closing line ("Have work that should *run itself?*" + email + ▶ Start a run, which scrolls to the form), so section 08 is titled "Start a *run.*" to avoid repeating it.
- **Phones**: all four run cards are shown (the design's artboard shows three); the featured run (RUN #011, the one the design highlights) leads with its media and trace. Below 1024px the home sections use the same 560px-max column as the phone stage so the rail lines up on tablets.
- "All runs 4 →" uses the real count of projects.
- `/work` and `/work/[slug]` links are not prefetched; they 404 until Phase 4.

## Needs the owner
1. **Process copy** (`content/process.json`) is a draft I wrote from the brief and the design's own line ("map the work, decide where a model helps, where code is safer, and where a person stays in the loop"). Please confirm or rewrite the five steps.
2. **Toolbox**: your real tools, grouped (the placeholders are the design's bracketed stack names).
3. **Contact delivery**: a Resend API key, the address to deliver to (`CONTACT_TO_EMAIL`), a sender on your domain, and optionally Upstash Redis for rate limiting across instances. Booking link.
4. **06 meta** reads "Live · reads only my case studies" as in the design; it becomes true in Phase 5.
5. Everything else still `[TODO]` is listed in AUDIT.md §6.
