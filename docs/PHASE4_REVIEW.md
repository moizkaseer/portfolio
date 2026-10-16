# Phase 4 review — Work index, run reports, title morph

Branch `phase-4-work` (on top of `phase-3-home`). Paused here for the owner's review.

## What was built
- **`/work/[slug]` — the Run Report** (RunReport.html, DESIGN_SPEC §6), prerendered for every project:
  - breadcrumb (← All runs / RUN #011 · Next · RUN #009 →), status row, title, lead (the `*starred*` phrase in serif italic), 5-column facts grid;
  - **01 The system** — the architecture diagram, laid out **at build time** from the project's `graph.json` (`lib/graph/diagram-layout.ts`): main path left → right, nodes off the main path under the node they branch from with the labelled dashed branch (`confidence < 0.9`), joining back where they lead. Same file feeds the home mini trace. Phones: the same graph stacked vertically. Accessible name: one sentence describing the whole workflow;
  - **02 Trace replay** — a terminal replays the sample run with its real timings (autoplays once when it scrolls into view; Replay; Speed 1× / 2× / 4×). The diagram above follows the replay: done / running / pending nodes, the packet on the connector into the running node. Before playing, with reduced motion and without JS, the whole run is shown finished;
  - **03 Results**; then the brief §6 sections the design doesn't show — **The problem, Decisions & tradeoffs, What's next** — rendered from the project's MDX body (numbered 04–06, same section language); **Next run** with the design's big link;
  - **C3** on the run report: the wire enters from the screen edge into the diagram's first node, leaves the last node for the right margin and runs down to "Next run", ticking into each section header (phones: right edge, 8px in). Scroll-drawn, one packet; still and fully drawn with reduced motion.
- **`/work` — all runs**, filterable by Agents · Automations · Tools · Experiments (counts; empty categories disabled; `aria-pressed`), using the home run table's rows and the phone cards. Not in the design canvas: built from its tokens (DESIGN_SPEC §7).
- **Title morph**: run titles carry a shared view-transition name (React 19.3 `<ViewTransition share="morph">`) on the home rows and cards, the `/work` rows and cards, the run report `<h1>` and the "Next run" link, so the title morphs into place on navigation (560ms, expo-out). Browsers without the View Transitions API simply navigate; reduced motion turns the animation off. Run links prefetch in full so the destination is ready when the morph starts.
- Nav: "01 Work" is underlined on `/work` pages, as in RunReport.html (CSS only).
- Home row links now go to the run reports; "All runs 4 →" to `/work`.

## Fidelity (DESIGN_SPEC §9)
`node tests/fidelity/compare-run.mjs` — `?freeze=run-report` (the design's frame: replay at row 4 / 6, 1.34s, *Validate totals* running) vs `run-report-{day,night}.png`, 1440 wide. Images in `docs/fidelity/phase-4/`.

| Region | Day | Night |
|---|---|---|
| Top → end of Results | 2.54% | 2.67% |
| "Next run" block | 0.22% | 0.22% |

Remaining differences: text rasterisation (Vercel's Geist build), the C3 wire (left edge → first node; right margin), and one exception like the agent lead's: the Results labels use `25ch` instead of `24ch` so "[of invoices posted with no human touch]" keeps the design's line break with Vercel's Geist (same reason as the approved 42 → 43ch). Screens not in the design: `docs/fidelity/phase-4/screens/` (`/work` desktop + phone, run report on phones, a run report without a trace). **Title morph recording**: `docs/fidelity/phase-4/screens/title-morph.webm` (home row → run report → next run; 1.5MB, git-ignored like the other recordings).

## Tests
`tests/e2e/work.spec.ts`: `/work` lists and filters; nav underline on `/work`; freeze state matches the design's frame; the replay autoplays once in view, finishes (6/6, last node done), Replay restarts, Speed cycles; reduced motion shows the finished run; breadcrumb + Next run navigate; all four run reports render with the MDX sections (and the right numbering without a trace); unknown slugs show the not-found page; opening a run from home happens inside a view transition; axe clean on `/work` and the run report in both themes; no horizontal scroll at 320–1920; **the home page's initial JS ≤ 190KB** (now a test). `tests/unit/content.test.ts`: the diagram layout reproduces RunReport.html from `graph.json`.

**86 e2e + 26 unit, all passing.** Lighthouse mobile — `/work/invoice-extraction-pipeline`: 92 / 100 / 100 / 100 (LCP 2.1s, CLS 0.006); `/work`: 92 / 100 / 100 / 100.

## Home JS budget — a correction, and the fix
My Phase 3 report said the home page was "exactly at" 190KB; the shell measurement rounded down. The new budget test measures exact bytes: Phase 3 was **190.9KB**, slightly over. Fixed in this phase without removing anything from the page — **home is now 189.2KB**:
- the contact form is now **server-rendered HTML that also works without JavaScript** (it posts to `/api/contact`, which answers a native post with a small page); its in-place submit, field errors and success trace load on demand when the form comes near or gets focus;
- the phone menu panel and the Shift+G grid overlay load on first use;
- the nav's current-section underline is CSS (`:has()`), not client JS.
Everything in Phase 4 lives on `/work` routes. Headroom is small (0.8KB); new home-page features should load on demand.

## Decisions taken
- **Diagram in HTML/CSS grid, as in the design** (the brief says SVG; the design wins on look). Layout is computed at build time from `graph.json`, so it stays one source of truth.
- **Trace data**: `content/projects/<slug>/trace.json`. The invoice pipeline uses the design's sample run. The two last rows had no times in the design's frame; their `ms` offsets only pace the replay (2305ms total puts 1.34s at 58%, as in the design). Projects without a `trace.json` show no replay section.
- **Categories** for `/work` are placeholders: Agents (support inbox, lead research), Automations (invoice pipeline, weekly ops report).
- **Run reports and Cache Components**: the pages are fully static, so the dev-only "instant navigation" check is turned off for that segment (`instant = false`) rather than adding a Suspense fallback, which would stop the title from morphing. Unknown slugs render the not-found page; because Partial Prefetching streams the static shell first, the very first request for an unknown slug can answer 200 (with `noindex`) and later ones 404 — framework behaviour, documented in the test. The custom 404 ("Run failed: route not found") comes in Phase 7.
- The trace section's copy ("This is a real run with customer details removed…") is the design's template text; it becomes true when the owner's real trace replaces the sample.

## Needs the owner
1. Real run data per project when available: frontmatter (lead, role, timeline, results), `graph.json` steps (with `detail` lines and branch labels), a sanitized `trace.json`, and the MDX body (problem, decisions & tradeoffs, what's next).
2. Confirm the `/work` categories.
3. Everything else still `[TODO]` is listed in AUDIT.md §6.
