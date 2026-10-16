# AUDIT — Phase 0 (content audit)

Date: 2026-10-15 · Status: **reviewed by the owner on 2026-10-15** (decisions recorded in §8).

## TL;DR

- **No owner content exists yet.** `legacy/` is empty (it holds only `.gitkeep`). The old-site URL in the kickoff prompt is still the template placeholder `https://YOUR-OLD-SITE.com`, so I had nothing to fetch.
- The design reference is complete and consistent: 12 screenshots, 2 recordings, 5 source screens and the motion module. All copy in the design is either approved site copy (hero, prompt, manifesto, agent section) or a `[bracketed placeholder]`.
- `/content` therefore holds only `systems.json`, the four C2 templates plus the generic one, copied verbatim from `hero-motion.ts`. I did **not** create project MDX or `graph.json` files: there are no real projects to base them on, and the design's sample projects are placeholders (see §3).
- **The repo layout needs one decision before Phase 1** (see §5.1).

---

## 1. Sources checked

| Source | Result |
|---|---|
| `/legacy` (filesystem root) | Does not exist. I took this to mean the kit's `legacy/` folder. |
| `portfolio-kit/legacy/` | Empty, only `.gitkeep`. No `legacy/assets` were created because there were no images to download. |
| Old site `https://YOUR-OLD-SITE.com` | Not fetched. It is the template placeholder, not a real address. |
| Git metadata | The git user is `moizkaseer`. I did **not** treat this as the site name. The name has to come from the owner. |

## 2. Content that exists (and where it lives)

| Content | Origin | Status |
|---|---|---|
| C2 templates: 4 examples + generic fallback, with their keywords | `motion/hero-motion.ts` | Ported to `content/systems.json` |
| Hero copy: "I build agents that do the work.", sub-line, CTAs, step tags, demo log | `HeroCombo.html` / `hero-motion.ts` | Approved. It stays in the hero component and motion module, not in `/content` |
| "Your turn" copy: kicker, headline, placeholder, CTA paragraph | `HeroCombo.html` | Approved, same as above |
| Manifesto: "Agents that fail loudly. Automations with an off switch. Systems your team actually trusts." | `Main.html` / brief | Approved wording, but it is a claim about how the owner works, so the owner should confirm it |
| Agent section: "Ask it about my work. It will *show* you." + 4 suggested prompts | `Main.html` / brief §7 | Approved |
| Footer: "Have work that should *run itself?*", "Built with a few agents helping" | `Main.html` | Approved |
| Run-report sample trace ("RUN_8841", invoice_8841.pdf, confidence 0.86 …) | `RunReport.html` | **Sample data.** The design text calls it "a real run with customer details removed", which is not true for the owner. Do not ship it |

## 3. Weak, outdated or must-cut

- **All four sample projects in the design are placeholders.** These are `[Invoice extraction pipeline]` RUN #011, `[Support inbox agent]` #014, `[Lead research agent]` #009 and `[Weekly ops report]` #006, with bracketed outcomes, stacks and years. They show the layout only and must be replaced by real projects or removed. Run IDs should come from the owner's own numbering, or we should agree on a scheme.
- **Hero stats `[N]`:** "Agents in production" and "Hours automated / yr". If the owner has no defensible numbers, I propose removing the stats block rather than inventing values. This would change the approved layout, so it needs the owner's OK.
- **Hero demo log** ("Reconcile March invoices · 41 rows matched · report sent to #finance"). It is labelled `LIVE RUN · DEMO`, so it is acceptable as-is.
- **Section 08 Proof:** there are no testimonials or metrics, so per the brief I will **omit** it until real material exists.
- **The old graph hero** at the top of `Main.html` / `Mobile.html` and the "01 — Index" row: cut, per the brief.
- Nothing from an old site to cut, because none was provided.

## 4. Design reference inventory

### Screenshots

| File | Size | What it shows |
|---|---|---|
| `hero-night-start.png` | 1440×1840 | Desktop hero + section 02 at 0.4s, night. Line 1 "I build" filled, lines 2–4 hollow outlines, packet on node 1. Log shows row 1, "STEP 1 / 4". Prompt is empty with ghost boxes for example 1, status "Waiting for your task". **Uses the short nav** (WORK AGENT ABOUT CONTACT · AVAILABLE · [CITY] 19:42) |
| `hero-day-start.png` | 1440×1840 | Same moment, day |
| `hero-night-prompt-done.png` / `hero-day-prompt-done.png` | 1440×1840 | 17.0s. All lines filled, wires lit, log complete ("COMPLETE · 8.2S", last row highlighted). Packet at the `›`. Prompt typed "Reconcile invoices from Gmail into our accounting tool", chip 1 selected, 5 boxes revealed, box 5 active with the connector packet. Status "TEST RUN · STEP 5 / 5", summary "5 steps · 1 model · 1 human check" |
| `hero-phone-night-start.png` / `hero-phone-day-start.png` | 390×1970 | Phone hero at 0.4s. Nav with LED + Menu, meta row, small staircase, rail on the right edge. Panel shows only the newest row, aligned to the bottom. Buttons stacked full width, prompt with square ↵ button, chips scrolling sideways, 5 ghost boxes stacked |
| `hero-phone-night-prompt-done.png` / `hero-phone-day-prompt-done.png` | 390×1970 | Phone at 17.0s. Panel shows the last 3 rows with short times. Boxes stacked with vertical connectors, box 5 active |
| `home-night.png` / `home-day.png` | 1440×3651 | Home. Full nav: 01–04 links, [CITY] 19:42, LED, "Available for projects", Night/Day shift toggle. The **old graph hero (ignore)**. "02 — How I work" manifesto with the last sentence muted and "trusts." in italic serif. "03 — Selected runs" table with 4 placeholder rows: RUN #011 is hovered, with the ghost pointer + `agent · highlight_project` pill, mini trace and striped media box. "All runs [N] →". "05 — Talk to my agent": chips and a terminal with the tool-call trace and ACTING ON THE PAGE. Footer with closing line, email, ▶ Start a run, full-width `[YOUR NAME]` wordmark and the bottom mono row |
| `run-report-day.png` / `run-report-night.png` | 1440×2456 | Run report. Breadcrumb (← All runs / RUN #011 · Next · RUN #009 →), status row, huge title, lead with an italic phrase, 5-column facts grid. "01 — The system" diagram: 4 boxes in a row + a dashed "confidence < 0.9" branch to the Human box. "02 — Trace replay" with a terminal (REPLAYING 4/6, progress bar, Replay / Speed 1× buttons). "03 — Results": three `[N]` numbers. "Next run" link |

### Recordings
- `hero-loop.mp4`: desktop, 1440×1840, 25fps, 19.3s. One full loop with example 1 through the restart. Video time equals design time.
- `hero-phone-loop.mp4`: the same loop on the phone stage, 390×1970.

### Source and motion
- `source/HeroCombo.html`, `HeroComboMobile.html`: the chosen hero + section 02, desktop and phone. The most important files.
- `source/Main.html`: nav, manifesto, selected runs, agent terminal, footer (plus the old hero to ignore).
- `source/RunReport.html`: case-study template.
- `source/Mobile.html`: phone patterns only. Its hero is the old graph hero; use only the nav, stacked run cards (media on top) and the "Ask the agent · ⌘K · live" bottom bar.
- `motion/hero-motion.ts`: timings, packet points (desktop + mobile), templates, `stateAt`, `deriveVisuals`, `REDUCED_MOTION_STATE`. To be imported as-is.
- `motion/TIMELINE.md`: millisecond table of the 4 loops (18.874 / 18.517 / 18.126 / 18.169s).
- `motion/hero-motion.check.js`: contains **31** `expect` calls; DESIGN_SPEC says 28. This doesn't matter, I'll port all of them.

### Screens the design does not cover
Process (05), Toolbox (07), Proof (08), contact form fields, `/work` index, about, 404, command palette, mobile menu, toast. These will be built from the same tokens per DESIGN_SPEC §7, with screenshots for review.

## 5. Inconsistencies found (need a decision or a confirmation)

1. **Repo layout.** The git root is `/home/moizali/portfolio/portfolio`, but the kit sits two levels down in `portfolio-starter-kit/portfolio-kit/`. The brief expects `REDESIGN_BRIEF.md`, `DESIGN_SPEC.md`, `design-reference/` and `legacy/` at the repo root, with Next.js scaffolded there. **I propose moving the kit's contents (including this file and `content/`) to the repo root at the start of Phase 1** and deleting the empty wrapper folders. Nothing is committed yet.
2. **Tokens: brief §3 vs DESIGN_SPEC §1.** They disagree on night `--ok` (brief keeps `#2E9B5A`, design `#3DBA6F`), `--paper2` (hero `#141413`/`#E5E1D8` vs home `#161614`/`#E3DFD6`) and `--line-strong` (0.28/0.30 vs 0.30/0.32). The design wins on look, so I'll use DESIGN_SPEC's values, including the per-screen variants.
3. **Night terminal colour.** `Mobile.html` uses `--term: #1E1E1B`; DESIGN_SPEC and `RunReport.html` use `#161614`. I'll use the spec value `#161614` unless the owner says otherwise.
4. **Nav height.** The brief says 56px; DESIGN_SPEC says 64px desktop and 56px phone. I'll follow the spec.
5. **Nav on the hero.** The hero screenshots show a shortened nav. DESIGN_SPEC §2 says the full `Main.html` nav wins on every page. **So the built hero won't match the hero screenshots pixel-for-pixel in the nav strip**, and that strip will be excluded from or noted in the fidelity diff.
6. **Section numbering.** `Main.html` labels the manifesto "02 — How I work", Selected runs "03" and the agent section "05". The brief's order is 02 Your turn, 03 Manifesto, 04 Selected runs, 05 Process, 06 Agent, 07 Toolbox, 08 Proof, 09 Contact. DESIGN_SPEC §5 says to follow the brief's numbering. If Proof is omitted, Contact becomes 08. Please confirm whether to renumber or leave the gap.
7. **Brief §5 sub-headings** use the old numbers (e.g. "02 · Manifesto", "05 · Talk to my agent"). I'll follow the order line, not the headings.
8. **Next.js 16 request interception** is `proxy.ts`. I'll check the installed version's docs in Phase 6.

## 6. Content Gaps (everything the owner must provide)

**Identity and status**
- [ ] Name exactly as it should appear (nav, footer wordmark, colophon, JSON-LD, curl). The wordmark is set at 15.2vw, so name length affects the footer.
- [ ] One-line positioning. The approved hero line is "I build agents that do the work."; confirm it.
- [ ] City (nav clock, meta row `Online · [CITY]`) — timezone set to Europe/Skopje (2026-10-15)
- [ ] Availability: "Available for projects" or "Booked until [month]"
- [ ] Domain (canonical URLs, `Try curl [domain]`, OG, llms.txt)
- [ ] The old site's real URL and/or files in `legacy/`: bio, services, project write-ups, CV, images you own

**Contact**
- [ ] Email for the contact link and Resend delivery
- [ ] Booking link
- [ ] GitHub, LinkedIn, X/other URLs

**Projects (3–5), for each:**
- [ ] Name, client/industry, and whether the client can be named (y/n)
- [ ] Problem: what was manual, how long it took, what it cost
- [ ] What you built + stack (orchestrator, models, APIs)
- [ ] Your role and timeline
- [ ] Status (in production since [year] / handed over)
- [ ] Real results: 2–4 numbers (hours saved, accuracy, speed, cost) + measurement period
- [ ] The steps and how they connect, e.g. "Gmail trigger → classify → CRM lookup → draft → human approves → send". This becomes `graph.json`, including any branches like "confidence < 0.9 → human"
- [ ] One sanitized example run with timings, for the trace replay
- [ ] 15–30s muted screen recording (≤ 2MB) or screenshots
- [ ] Decisions and tradeoffs (guardrails, evals, failure handling), and what you'd change

**Site-wide**
- [ ] Hero stats: numbers for "Agents in production" and "Hours automated / yr" (block is kept; owner reply had `[LABEL]: [NUMBER]` placeholders)
- [ ] Toolbox: tools you actually use, grouped (Orchestration / Models / Data / Surfaces …)
- [ ] Testimonials (optional; without them Proof is omitted) and any real counters
- [ ] Confirm the manifesto wording is true to how you work
- [ ] About page: bio, "now", timeline
- [ ] LLM provider + API key (server env only), plus Upstash and Resend accounts. Optional for launch: without them the agent runs in scripted demo mode and C2 uses the instant engine

## 7. What I did / did not do
- Did: read both briefs fully; looked at every screenshot and the motion files; extracted the text of every design source; created `content/systems.json`; wrote this audit.
- Did not: scaffold anything, move files, commit, fetch any URL, or create placeholder projects.

## 8. Owner decisions (2026-10-15)

1. Kit moved to the repo root before scaffolding. Done.
2. Hero stats block is kept. The owner's reply still had template brackets (`[LABEL 1]: [NUMBER]`), so per their instruction the `[N]` placeholders stay and the labels stay as designed.
3. Proof is omitted until there are testimonials; Contact is renumbered to **08**.
4. The full nav wins on every page; the nav strip is noted, not counted, in the visual comparison.
5. The owner's reply listed name, city, timezone, email, domain, booking link, socials and old site as template brackets, so **every item in §6 is still open**. They live in `content/site.json`, marked `[TODO]`.
6. Projects are not ready: placeholders stay; continue with Phase 1–2.

## 9. Owner decisions (Phase 2 review, 2026-10-15)
Contrast fix applied (`--muted-raised`), JS budget 190KB, Geist from Vercel's files, timezone Europe/Skopje. Name, city, email, domain, booking link, socials and hero stat numbers stay placeholders until before launch. Projects use the design's placeholder projects (`content/projects/*`, every field marked `[TODO]`) until the owner sends real ones.

## 10. Phase 3 additions to the Content Gaps (2026-10-15)
- [ ] Confirm or rewrite the **Process** copy (`content/process.json`) — draft written from the brief and the design's own wording.
- [ ] **Toolbox**: real tools by group (`content/toolbox.json` holds the design's bracketed placeholders).
- [ ] **Contact delivery**: Resend API key, `CONTACT_TO_EMAIL`, sender address on the domain; optionally Upstash Redis (see `.env.example`).
- [ ] Booking link (contact section shows `[booking link]`).
- [ ] Projects: replace the four design placeholders (`content/projects/*`) — frontmatter, `graph.json` steps, recordings.
