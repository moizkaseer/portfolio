# Portfolio Redesign Brief — "The Machine Room"

> **How to use this file (fresh repo):**
> 1. Create an empty folder and run `git init`. Unzip the starter kit into it, so the folder contains `REDESIGN_BRIEF.md`, `DESIGN_SPEC.md`, `design-reference/source/` and `design-reference/motion/`.
> 2. Nothing to add for the design: `design-reference/` already contains the screenshots (both themes, desktop and phone) and two frame-accurate screen recordings of the hero loop, all generated from the approved design. See `design-reference/README.md`.
> 3. Create `legacy/` and put anything worth keeping from the old site in it: text, project write-ups, images, your CV. Or just give the old site's URL in step 4.
> 4. Open Claude Code in that folder and paste:
>
> ```
> Read REDESIGN_BRIEF.md and DESIGN_SPEC.md completely before doing anything.
> This is a brand-new repo. The site must look exactly like the approved design.
> Execute Phase 0 only. My old site is at [OLD SITE URL] and any files I kept are in
> /legacy. Write AUDIT.md and stop so I can review. Follow every rule in both files.
> ```
>
> After you approve the audit, say: `Continue with Phase 1. Pause after Phase 2 (the hero) so I can review it.`

---

## 0. Who this site is for (read first, Claude)

The owner builds **AI agents and automation systems**. The current site reads like a generic company website. The new site must read like the personal lab of someone who builds machines that do work — technical, confident, crafted, and unmistakably *one person's* site.

**Audiences, in priority order**
1. Clients / founders looking to hire someone to automate work with AI agents.
2. Technical hiring managers and other engineers.
3. Award juries (Awwwards / FWA / CSSDA) and the design community.

**What a visitor must understand in 5 seconds:** *who this is, that they build AI agents and automations that run in production, and how to start working with them.*

**Target bar:** Awwwards Site of the Day + Developer Award quality. Awwwards juries score Design 40%, Usability 30%, Creativity 20%, Content 10%, and most submissions lose on **usability and performance**, not creativity. So: flawless fundamentals first, then *one* unforgettable idea executed perfectly at 60fps.

---

## 1. The concept

### Big idea: "Everything here is a running system."
The site behaves like a live automation. Instead of a brochure, visitors see an agent graph working, case studies presented as **run reports**, and an agent they can actually talk to — with its tool calls visible. The site is the proof of the skill.

### The four signature features (specs in the "Creative layer" section, C1–C4)
1. **C1 — The agent drives the website.** Visitors ask the agent something and it scrolls, highlights, opens projects and switches theme in front of them.
2. **C2 — "What should run itself?" prompt.** Directly under the hero, visitors describe a task in their own words and watch the system I would build for it appear and test-run. The result prefills the contact form.
3. **C3 — One continuous wire.** The hero's headline is itself a running workflow. Its final wire leaves the hero, becomes the underline of the C2 prompt box, then continues down the page as a rail that every section hangs off. Each project's real architecture (from `graph.json`) draws itself along that wire.
4. **C4 — `curl` version.** `curl [domain]` in a terminal returns a beautiful plain-text portfolio.

Everything else on the site stays restrained so these four stand out. Do not add other big effects.

### Positioning line (pick one or write better — keep it short)
- "I build AI agents that do the work."
- "Agents, automations, and the systems that keep them honest."
- "I turn repetitive work into systems that run themselves."

### Aesthetic direction: *engineered editorial*
Swiss-grid editorial layout × control-room instrumentation × lab notebook.
- Huge, tight display type; small monospaced labels, indices, timestamps, run IDs.
- **Night shift is the default theme** (near-black `#0C0C0B` background, warm off-white type), matching the chosen hero design. Day shift (warm paper background, ink-black type) is available from the toggle. **One** signal color means "something is running".
- A dark "night shift" theme that is a true inversion, not a neon variant.
- Hairline rules, a visible 12-column grid, status LEDs, numbered sections (`01 / WORK`).

### Explicitly avoid (these are the clichés of AI portfolios in 2026)
- Deep-space / starfield backgrounds, cyan-purple glow gradients, glassmorphism cards.
- Robot, brain, circuit-board or "neural network" stock imagery; 3D glossy blobs.
- Inter / Space Grotesk / Poppins as the main face.
- Lorem ipsum, fake logos, fake testimonials, made-up metrics. Use `[TODO: …]` markers instead and list them for the owner.
- Preloaders longer than ~1s, scroll-jacking on mobile, hidden native cursor, autoplay sound, emoji used as icons.

---

## 2. Tech stack

**Decision:** this is a **brand-new repository**. Scaffold a fresh Next.js project at the repo root. Nothing from the old site's code is reused — only its content, which is ported into `/content` during Phase 0.

**This stack is final. Do not swap frameworks or add alternatives without asking the owner.**

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16 (App Router), TypeScript strict** | Use the latest stable 16.x. Static-render every page; only the agent, prompt and contact routes run on the server. |
| Styling | **Tailwind CSS v4** (CSS-first config) + CSS custom properties for tokens | Tokens in `app/styles/tokens.css`. No component library. |
| Motion | **GSAP** (core + ScrollTrigger, SplitText, Flip, MotionPath, DrawSVG, CustomEase) | All GSAP plugins are free for commercial use now. Use `@gsap/react` `useGSAP` for cleanup. |
| Smooth scroll | **Lenis**, driven from GSAP's ticker | Do **not** instantiate Lenis at all when `prefers-reduced-motion: reduce`. |
| Graphics | **Plain SVG + GSAP** | The wire, nodes and diagrams are SVG. No three.js / WebGL in the first version; don't add it unless the owner asks. |
| Content | **MDX** files in `/content` (projects, about, now) with typed frontmatter (zod) | Single source of truth — the agent, the prompt templates and the `curl` version read from the same files. |
| AI (agent + smart prompt) | **Vercel AI SDK** + the owner's LLM provider | Streaming responses and tool calls for the visible trace (§7, C1, C2). Keys only in server env vars. |
| Rate limiting | **Upstash Redis** (`@upstash/ratelimit`) | Per-IP limits on the agent, the smart prompt and the contact form, so nobody can run up the AI bill. |
| Contact email | **Resend** | Delivers contact-form submissions to the owner's inbox. |
| Fonts | `next/font` self-hosted, `font-display: swap`, subset | See §3. |
| Hosting | **Vercel** | Free tier is enough to start. A preview link for every pull request; production on the owner's domain. |
| QA | Playwright (screenshots + smoke tests), Lighthouse CI, axe-core | See §10. |

**Why Next.js (decision record).** The site's hardest feature is the agent that drives the website (C1): its conversation and ghost pointer must survive page changes, and it shares state with the hero, the prompt (C2) and the contact form. Next.js's persistent root layout and React state handle this without workarounds, and the AI SDK's streaming tool calls fit the visible trace directly. It is also the stack many of the owner's future clients use, so the portfolio doubles as proof of fluency in it. **Astro was considered:** it ships less JavaScript and would be the better choice for a mostly-static content site, but this site's three signature features are interactive and connected, and wiring them across separate islands would cost more than the small speed gain. Next.js still meets every budget in §9.

Optional but recommended: install GreenSock's official GSAP agent skills (`github.com/greensock/gsap-skills`) so GSAP code follows current best practice.

**CSS scroll-driven animations / View Transitions:** use as progressive enhancement only. Firefox still ships `animation-timeline` behind a flag as of mid-2026, so anything essential runs on GSAP. Use the View Transitions API for project ↔ case-study title morphs, with a plain fade fallback.

---

## 3. Design system (tokens)

### Color
```css
:root {
  /* light — "day shift" (default) */
  --paper:    #EDEAE3;   /* background */
  --paper-2:  #E3DFD6;   /* raised surfaces, code blocks */
  --ink:      #0E0E0C;   /* primary text */
  --ink-2:    #3B3A36;   /* secondary text */
  --muted:    #6A675F;   /* labels, meta (darkened from the first draft to pass WCAG AA at 11–12px) */
  --line:     rgb(14 14 12 / 0.14); /* hairlines, grid */
  --signal:   #FF4F1A;   /* "running" — the ONLY accent. Use sparingly: packets, active states, LEDs, focus ring */
  --ok:       #2E9B5A;   /* status LED only, never for large areas */
}
:root[data-theme="dark"] {
  /* "night shift" */
  --paper:   #0C0C0B;
  --paper-2: #161614;
  --ink:     #ECE9E2;
  --ink-2:   #B5B2AA;
  --muted:   #8C8980;
  --line:    rgb(236 233 226 / 0.12);
  --signal:  #FF4F1A;   /* identical in both themes, as in the design */
}
```
Also define `--line-strong` (day `rgb(14 14 12 / 0.32)`, night `rgb(236 233 226 / 0.30)`) for inactive graph edges and outlined buttons. `--signal` fails text contrast on paper, so **never use it for text** — only for packets, LEDs, markers, focus rings and the block cursor. Text on a `--signal` fill is always `#0E0E0C`.
First visit opens in **night shift**; the toggle persists the visitor's choice (wrapped in try/catch). Check every text/background pair for WCAG AA; `--muted` is for ≥14px labels only.

### Typography (all free)
- **Display + UI:** Geist (variable). Display weight 500–600, tracking `-0.045em`, line-height `0.88`.
- **Mono (labels, logs, run IDs, code):** Geist Mono. Uppercase labels at 11–12px, tracking `+0.06em`.
- **Accent:** Instrument Serif *Italic* — used for 1–2 words per headline max (e.g. "I build agents that *do the work*"). This contrast is the signature typographic move.
- Paid upgrade if the owner wants: PP Neue Montreal / Berkeley Mono.

Fluid scale (clamp, no breakpoint jumps):
```css
--fs-mega:    clamp(3.5rem, 12vw, 13rem);  /* hero name / footer wordmark */
--fs-display: clamp(2.75rem, 7vw, 7.5rem);
--fs-h2:      clamp(2rem, 4.2vw, 4rem);
--fs-h3:      clamp(1.375rem, 2vw, 1.875rem);
--fs-body:    clamp(1rem, 0.95rem + 0.25vw, 1.1875rem);
--fs-label:   0.75rem;  /* mono */
```
Body max width 62ch. Headlines use `text-wrap: balance`, paragraphs `text-wrap: pretty`.

### Layout
- 12-column grid, `--gutter: clamp(16px, 2vw, 32px)`, outer margin `clamp(16px, 4vw, 64px)`. Max content width 1680px; mega type may break out full-bleed.
- Toggleable grid overlay with `Shift+G` (dev + easter egg).
- Every section starts with a mono header row: `01 — SELECTED RUNS` · section count on the right · hairline below.

### Motion language
- **Ease:** reveals `expo.out` (≈ `cubic-bezier(0.16, 1, 0.3, 1)`); UI state changes `power2.out`; nothing bouncy except packets on the graph.
- **Durations:** hover 200–250ms; reveals 700–1100ms; page transitions ≤ 600ms.
- **Text reveals:** SplitText by *lines*, masked, translate-y 100% → 0, stagger 0.06s. Never split body copy into chars.
- Only animate `transform`, `opacity`, `clip-path`, and shader uniforms. Never layout properties.
- Every animation has a reduced-motion tier: **Tier A** (decorative: parallax, smooth scroll, graph physics) → removed; **Tier B** (reveals) → simple 200ms opacity fade; **Tier C** (state feedback) → kept.

### Cursor & micro-interactions
- Keep the native cursor. Over interactive elements, a small `--signal` dot trails the pointer (lerp 0.18) and links get a magnetic pull of max 6px. Disabled on touch and reduced motion.
- Buttons: label slides up and is replaced by a duplicate (classic roll), arrow nudges 4px.
- Links in body text: underline draws left→right on hover via `background-size`.
- Status LEDs pulse slowly (2.4s) — the site always looks "on".

---

## 4. Information architecture

```
/                     Home (single long page, sections below)
/work                 All runs (filterable index: Agents · Automations · Tools · Experiments)
/work/[slug]          Case study ("run report")
/about                About + now + toolbox + timeline
/lab        (opt.)    Notes, experiments, small demos
/llms.txt             Machine-readable summary for AI crawlers
404                   "Run failed: route not found"
```

**Global nav (fixed, 56px, blends with `mix-blend-mode: difference` over the hero):**
left = name/wordmark → home · center = Work, Agent, About, Contact · right = live local time (owner's timezone) + green LED "Available for projects" (or amber "Booked until [month]") + theme toggle.
Mobile: full-screen menu, mega-size links staggered in, current time + status at the bottom.

**Command palette:** `⌘K` / `Ctrl+K` / `/` opens a palette (go to any project, toggle theme, copy email, ask the agent). Fits the developer audience and is a jury-friendly detail. Fully keyboard accessible.

---

## 5. Home page — section by section

**Section order on the home page:** 01 Hero → 02 Your turn (C2) → 03 Manifesto → 04 Selected runs → 05 Process → 06 Talk to my agent → 07 Toolbox → 08 Proof → 09 Contact → Footer. The section headings below keep their original names; use this order and numbering.

### 01 · Hero — "Circuit type" (signature moment; spend the most effort here)
Match the "Chosen — Hero A wired into prompt C" screen in `/design-reference/` exactly. Default theme for this screen is night shift.
- **The headline is the workflow.** "I build / agents / that do / *the work.*" is set at ~132px (the last line in Instrument Serif italic, ~150px), stepping down the screen as a staircase: each line starts ~150px further right and ~134px lower than the previous one.
- Each line is a step with a mono tag above it: `01 TRIGGER`, `02 PLAN`, `03 ACT`, `04 SHIP`, followed by its live status (`queued` / `running` / `done`).
- A node square sits ~40px left of each line. Orthogonal wires connect them: down from node *n*, then right into node *n+1*. A wire also enters from the left edge of the screen into node 1. Faint dashed vertical guides run under each line's start.
- **The run:** pending lines are hollow outlines (`-webkit-text-stroke` in `--line-strong`, transparent fill). An orange packet travels the wires; as it reaches each node, that node turns orange, its line fills solid (500ms color transition), and the previous line's status becomes `done`. The packet follows the wire's corners, never cutting diagonally.
- **Live run panel** (top right, ~366px wide): mono log that prints one line per step with timestamps — demo text such as `trigger · request "Reconcile March invoices"` → `plan · 3 steps · 2 tools · 1 check` → `act · sheets → ledger · 41 rows` → `ship · verified · report sent` → `done · 8.2s · next run: yours ↓`. The current line has an orange left bar. Label it clearly as a demo.
- **Bottom row:** one-sentence sub-line, primary CTA "Start a project", secondary "Try it on your task ↓" (scrolls to section 02), and two real stats `[N]`.
- **The exit:** after `ship`, the wire leaves node 4, runs right to the margin (label `SHIPPED · NEXT RUN IS YOURS ↓`), then turns down the right margin. This is where C3 begins.
- **Timing — exactly as in the design** (all values in DESIGN_SPEC.md): the hero run plays, hands the packet down to the prompt, the prompt plays one example, and then the hero runs again — a continuous loop, the same as the design. The loop **pauses** whenever the hero and prompt are both out of view or the tab is hidden, and resumes where it stopped.
- **Phones:** follow the chosen phone design exactly — DESIGN_SPEC.md §8 and the "Chosen — phone version" screen (`design-reference/source/HeroComboMobile.html`). It is a 390-wide stage scaled uniformly with the screen width, so it keeps the same proportions on every phone. Same staircase and timeline as desktop; rail on the right edge. Ignore the "Not chosen — fluid phone" screens on the canvas.
- **Motion source of truth:** `design-reference/motion/hero-motion.ts` (import it as-is) and `motion/TIMELINE.md`. See DESIGN_SPEC.md §10 for how to drive it.
- **Accessibility:** the `<h1>` contains the plain sentence "I build agents that do the work." The outline/fill effect is purely visual; tags, wires and the log are `aria-hidden`, with the log's content available as a visually hidden list.
- **Reduced motion:** no packet travel; everything shows in its finished, filled state.
- **Performance:** SVG for wires and nodes, CSS transitions for colors, GSAP for the packet path (MotionPath along the same SVG path). No canvas or WebGL needed here — the headline must be the LCP element.

### 02 · Manifesto
Two or three big sentences about how the owner works (e.g. "Agents that fail loudly. Automations with an off switch. Systems your team actually trusts."). Line-by-line reveal tied to scroll; key words shift from `--muted` to `--ink` as they pass center (scrubbed).

### 03 · Selected Runs (work)
- 3–5 best projects only. Each row is a **run card**: run ID (`RUN #014`), project name in display size, one-line outcome, industry, stack chips, status (`● In production since 2025`), year.
- Hover (desktop): a looping muted video/screen recording of the system clips in from the row's edge (clip-path), and the row's mini trace (`trigger → classify → draft → approve`, drawn from the project's `graph.json`) animates once, branching off the C3 rail.
- Mobile: stacked cards with the media visible, no hover dependence. The card nearest the viewport center plays its mini trace.
- Clicking morphs the project title into the case-study header (View Transitions API / GSAP Flip).
- Link: "All runs (n) →" to `/work`.

### 04 · Process — "Trigger → Plan → Act → Verify → Ship"
Pinned section (desktop only; plain stacked steps on mobile). As the visitor scrolls, a single workflow diagram builds itself step by step; the left column shows the current step's title + 2-line explanation; a mono log on the right prints what happens at that step. Keep the pinned distance ≤ 2.5 viewport heights.

### 05 · Talk to my agent (live demo — see §7 and C1)
Full-width terminal-style panel. Suggested-prompt chips above the input. Visible tool-call trace. The agent can drive the site (C1). The same conversation is also available everywhere through a floating "Ask the agent" pill and the command palette. This is the second "wow", and the most persuasive thing on the site for clients.

### 02 · Your turn (see C2)
Directly under the hero. A serif-italic kicker "That was one of mine. Now yours." above the headline "What should *run itself?*", then the prompt box whose underline is the C3 wire.

### 06 · Toolbox
Not a logo wall. A dense, mono, table-like "integrations" grid: category → tools (e.g. Orchestration: `[TODO]`, Models: `[TODO]`, Data: `[TODO]`, Surfaces: `[TODO]`). Hovering a tool highlights the projects in §03 that used it (cross-link). Fill only with tools the owner actually uses.

### 07 · Proof
Real numbers and short real quotes only. Large counters animate once when in view (Tier B). If there are no testimonials yet, **omit the section** rather than fake it.

### 08 · Contact — "Start a run"
- Huge line: "Have work that should run itself?" + email (click copies, with toast "Copied — talk soon") + booking link `[TODO]`.
- Short form styled as a workflow trigger: `What should be automated?` / `Where does it happen today?` / `Email`. Submit button reads `▶ Run`. On submit, show a mini trace animating: `received → parsed → queued for [NAME]`.
- Server-side validation, honeypot + rate limit; deliver via the owner's existing email method.

### Footer
Full-bleed wordmark (owner's name) fitted to viewport width, revealed with a slow scrub as you reach the bottom. Small mono rows: socials, local time, `Last deployed: <build date>`, colophon "Designed and built by [NAME] — with a few agents helping."

---

## 6. Case study template — "Run Report" (`/work/[slug]`)

1. **Header:** run ID, title (morph target), one-sentence outcome, meta grid (client/industry · role · timeline · stack · status).
2. **Hero media:** real screen recording or the system diagram — no stock.
3. **The problem:** what was manual, how long it took, what it cost. 3–5 sentences.
4. **The system:** an animated SVG diagram of the actual architecture (nodes + edges in the site's graph style), built from a data file per project so it's reusable.
5. **Trace replay:** a log panel replays a real (sanitized) example run step by step with timings — `14:02:11 trigger  new invoice email` … `14:02:19 ship  posted to accounting · 8.2s`.
6. **Results:** 2–4 big numbers + what changed for people.
7. **Decisions & tradeoffs:** guardrails, evals, human-in-the-loop, failure handling. (This is what convinces engineers.)
8. **What's next / what I'd change.**
9. **Next run →** full-width link to the next project with preview on hover.

Write all case-study copy in first person, plain language, no buzzword soup.

---

## 7. Live agent demo — spec

**Goal:** a visitor asks things like "Have you built anything for e-commerce support?" and gets a grounded, streaming answer, *and sees the agent work* (tool calls, timings). It must be impossible to embarrass the owner.

- **UI:** terminal panel; user messages right-aligned in `--ink`, agent in mono; each tool call renders as a collapsible row: `⏺ search_projects(query: "e-commerce support") · 184ms · 2 results`. Streaming text with a block cursor. Suggested prompts: "What do you build?", "Show me your best automation", "How do you make agents reliable?", "Are you available?".
- **Tools (server-side, read-only, sourced from `/content`):** `search_projects`, `get_case_study`, `get_toolbox`, `get_availability`, `draft_intro_email` (returns a draft the visitor can copy into the contact form — never sends anything).
- **System prompt rules:** answer only from tool results about the owner's work; say "I don't know — ask [NAME] directly" otherwise; never invent clients, numbers or prices; keep answers short; English by default and reply in the visitor's language if they write in another one.
- **Safety & cost:** per-IP rate limit (e.g. 12 messages/hour), max output tokens, max 6 turns per session, input length cap, provider key only in server env, log nothing personal.
- **Fallback:** if no API key is configured or the provider errors, switch to a scripted demo mode that replays 3 pre-recorded conversations with the same UI (clearly labeled "demo replay").
- Accessible: `aria-live="polite"` on the transcript, full keyboard use, visible focus.

---

## Creative layer — signature features (C1–C4)

These are the reasons people will remember and share the site. Build each one to production quality. If time is short, cut polish elsewhere, not here.

### C1 — The agent drives the website
**What the visitor experiences:** they type "show me your best project". An orange ghost pointer appears, glides to the project card, the page scrolls there, the card highlights, and the case study opens. The agent's message says what it did. Other commands that should work: "switch to dark mode", "take me to contact", "what tools do you use?" (scrolls to Toolbox and highlights the relevant tools).

**Architecture**
- The agent has two kinds of tools: **server tools** (read-only data, §7) and **UI tools** executed in the browser.
- UI tools (strict allow-list, typed with zod, nothing else is possible):
  `ui.scroll_to(section: "your-turn" | "work" | "process" | "agent" | "toolbox" | "contact")`
  `ui.highlight_project(slug)` · `ui.open_project(slug)` · `ui.set_theme("light" | "dark")`
  `ui.highlight_tools(names[])` · `ui.prefill_contact({ summary })`
- The server streams UI tool calls to the client. A client-side action registry validates each call against the schema and the list of real slugs/sections, executes it, and returns a result to the agent so it can continue.
- Max 3 UI actions per agent turn. The agent can **never** submit a form, send an email, or leave the domain.
- Each action appears in the trace: `⏺ ui.open_project("invoice-agent") · done`.
- **Ghost pointer:** a `--signal` arrow cursor that glides (expo.out, 500–700ms) to the target element before each action, with a small label "agent". The visitor's real cursor is never touched.
- **The visitor is always in charge:** any wheel, touch, key press or click during an action cancels the remaining actions and shows `control returned to you`.
- The chat lives in the root layout, so the conversation and ghost pointer survive page navigation.
- Mobile: chat is a bottom sheet. While the agent acts, the sheet shrinks to a pill showing the current action, then expands again.
- Reduced motion: no glide; actions happen instantly with a brief outline highlight.
- Scripted fallback mode (§7) must include at least one replay that demonstrates UI control.

### C2 — "What should run itself?" prompt
**What the visitor experiences:** the hero's packet arrives along the wire and the `›` of a large input box lights up orange. The box then types an example task on its own ("Reconcile invoices from Gmail into our accounting tool"); below it, a 5-step system appears node by node (each marked Trigger / Model / Code / Human / Tool), and a quick test run lights the steps in order. Example chips ("Invoices → ledger", "Refund emails", "Monday KPI report", "Lead research") let them switch instantly. The moment they click into the box or type, the demo stops and their own words drive it: Enter → the system for *their* task appears. Then: "Build this with me →".

**Behavior**
- **Two engines, same UI:**
  1. *Instant (always on):* keyword matching to a small library of templates in `/content/systems.json` (start with the four examples; grow it over time). No match → a generic 5-step template labelled "drafted from your words". Free, instant, no abuse risk.
  2. *Smart (optional, when an LLM key is set):* a server route turns the visitor's sentence into the same 5-node JSON shape (`{ kind, title }[]`, kinds limited to Trigger, Schedule, Model, Code, Tool, Human), validated with zod and rate-limited like the agent (§7). If it fails or times out (>2.5s), fall back to engine 1 silently.
- **Node visuals:** same style as the run-report diagram — Model = circle mark, Trigger/Schedule = diamond, Code/Tool = square, Human = hollow square with a dashed border. Reveal 200–240ms apart (opacity + 10px rise, expo.out), connectors draw left→right, then a 480ms-per-step test run with the orange packet.
- **Status line** above the nodes: `Listening` → `Designing the system · 3 / 5` → `Test run · step 4 / 5` → `Ready to build`, and a summary on the right: `5 steps · 2 models · 1 human check`.
- **"Build this with me →"** scrolls to Contact and prefills "What should be automated?" with the visitor's sentence plus the generated steps in plain language, with a hidden field holding the JSON.
- **The agent can see it:** add a server-safe tool `get_prompt_state` so the visitor can ask the agent "could you really build this?" and it answers about that exact system.
- **Demo loop:** in the live site, autoplay only starts once the hero run has finished and the section is in view; it pauses when the section leaves the viewport and stops for good after the first interaction.
- **Accessibility:** a real `<label>`ed input; chips are buttons; the generated system is announced via `aria-live="polite"` as a short sentence ("Generated 5 steps: invoice email arrives, then …"). Fully keyboard operable.
- **Reduced motion:** no typing animation, no packet; the first example's finished system is shown, and generating a new one swaps instantly with a 200ms fade.
- **Phones:** per the chosen phone design (DESIGN_SPEC.md §8): input with a square ↵ button, a horizontally scrolling chip row, and the five boxes stacked vertically with vertical connectors.

### C3 — One continuous wire
**What the visitor experiences:** one wire runs through the whole site. It enters the hero from the left edge, carries the run through the headline, leaves past `SHIPPED`, turns down the right margin, becomes the underline of the C2 prompt box (the packet slides along it to the `›`), then continues down the right margin as a thin rail for the rest of the page. Every section header connects to it with a short horizontal tick; as the visitor scrolls, a single orange packet rides the rail, marking where they are. When they hover a project, its real architecture branches out from the rail into the row. It feels like one system powering the whole site.

**Architecture**
- One SVG overlay per page, absolutely positioned over the content column (`pointer-events: none`), whose path is computed from the real positions of anchor elements (hero node 4, prompt input, each section header) and recomputed on resize with a `ResizeObserver`.
- **From the hero to the prompt underline the wire is always visible**, exactly as in the design: drawn in `--line-strong` and lighting up to `--ink` as the packet passes. **Below the prompt section**, the rail draws itself as the visitor scrolls (`stroke-dashoffset` scrubbed by ScrollTrigger), and a packet follows it with GSAP MotionPath, tied to scroll progress.
- The handoff from hero → prompt is the one place the packet moves on its own (time-based, ~2.4s total), triggered when the hero run finishes *and* the prompt is in view; otherwise it waits.
- **Project graph data** lives in `/content/projects/<slug>/graph.json`: `{ nodes: [{ id, label, kind }], edges: [[from, to]] }`. The same file feeds the row's mini trace on hover, the architecture diagram on the case-study page (§6.4), and the agent's `get_case_study` tool. One source of truth. Compute layouts at **build time** (elkjs or dagre).
- On the run-report page the wire comes in at the top, runs into the system diagram's first node, and exits from the last node to the "Next run" link.
- Phones: the rail stays on the **right** edge, 8px in, as in the phone design; section ticks point left from it.
- Performance: one SVG, a handful of paths, no canvas. Stop all updates when the tab is hidden.
- Reduced motion: the wire is fully drawn and static, no packet; hover traces appear without animation.

### C4 — `curl` version of the portfolio
**What the visitor experiences:** in a terminal, `curl [domain]` returns a crafted plain-text portfolio with an ASCII wordmark, orange accents, current availability, selected runs with outcomes and links, toolbox and contact. `curl [domain]/work/<slug>` returns that case study in text.

**Implementation**
- Use Next.js request interception (in Next.js 16 this file is `proxy.ts`, formerly `middleware.ts` — check the installed version's docs). If the `User-Agent` matches `curl|Wget|HTTPie|xh` **and** the `Accept` header does not include `text/html`, rewrite to a route handler that returns `text/plain; charset=utf-8`.
- Generate the output from `/content`, so it is always in sync with the site.
- Max 80 columns. Use ANSI 256-color for the signal accent (e.g. color 202) and bold for headings. `?nocolor` returns the same text without ANSI codes.
- Set `Vary: User-Agent, Accept` so CDN caching never serves the text version to browsers or the HTML to curl.
- Include the visitor's own hint at the end: `Try: curl [domain]/work/<slug>`.
- Advertise it in the footer (`Try curl [domain]`) and in a browser-console message for developers.
- Add an automated test: request with a curl user agent → `text/plain`, contains the name and an email; request with a browser user agent → HTML.

---

## 8. Accessibility & usability (non-negotiable)

- WCAG 2.2 AA. Semantic landmarks, one `h1` per page, skip link, visible focus ring in `--signal` (2px, offset 3px).
- Every interaction reachable by keyboard; graph nodes have a parallel accessible list.
- `prefers-reduced-motion`: Lenis not created, graph shows static SVG, reveals become fades, pinned sections unpin.
- No information conveyed by hover only. Touch targets ≥ 44px.
- Content readable with JavaScript disabled (SSR all text).

## 9. Performance budget

- Lighthouse mobile: Performance ≥ 90, Accessibility 100, Best Practices 100, SEO 100.
- LCP < 2.0s (the hero headline), CLS < 0.05, INP < 200ms.
- Initial JS ≤ 150KB gzipped on the home route; the agent chat and command palette load on first interaction; GSAP plugins imported per use.
- Images: AVIF/WebP via `next/image`, explicit sizes. Videos: muted, `playsinline`, ≤ 2MB each, poster frames, loaded on hover-intent/in-view.
- Fonts: 3 families max, subset, preload only the display weight.
- Sustained 60fps while scrolling on a mid-range phone, including while the wire draws and the packet moves.

## 10. SEO, sharing & "GEO"

- Per-page metadata, canonical URLs, sitemap, robots.
- JSON-LD: `Person` (name, jobTitle, sameAs socials) on home; `CreativeWork` per case study.
- Dynamic OG images per page (`next/og`) in the site's visual style (paper bg, mega type, run ID).
- `/llms.txt` summarizing who the owner is, services, and links to case studies, so AI assistants describe the owner correctly.
- Favicon: a single `--signal` square that pulses in the tab while the agent is responding (fun detail).

---

## 11. Build phases (follow in order)

### Phase 0 — Content audit (then STOP for review)
1. This is a fresh repo. Do not scaffold anything yet.
2. Gather the owner's real content: read everything in `/legacy`, and if the owner gave the old site's URL, read its pages (bio, services, projects, links, contact details). Download only images the owner clearly owns, into `/legacy/assets`.
3. Extract **all real content** into `/content` as MDX/JSON (draft `graph.json` for each project from whatever steps are described; mark guesses with `[TODO: confirm]`).
4. Look at every file in `/design-reference/` and list what each screen shows.
5. Write `AUDIT.md`: what content exists, what is weak or outdated, what you propose to cut, and a **Content Gaps** list — everything the owner must provide (project numbers, recordings, project steps for `graph.json`, testimonials, toolbox, availability, booking link, timezone/city, domain).
6. Stop and summarize.

### Approved visual design (reference for every phase)
The owner has a design canvas called **"Machine Room Portfolio"**; screenshots are in `/design-reference/`. The **hero and section 02 come from the screens "Chosen — Hero A wired into prompt C" (desktop) and "Chosen — phone version" (phone)** — follow them exactly, with the motion from `design-reference/motion/`. The rest of the home page (manifesto, selected runs with the agent's ghost pointer, agent terminal, footer) and the run report come from the "Home" and "Run report" screens. Ignore the older graph hero at the top of the "Home" screens and the other hero concepts (B, the departures board). Where the design and this brief disagree, the design wins on look; this brief wins on behavior.

### Phase 1 — Foundation
Scaffold a fresh Next.js project at the repo root (TypeScript strict, Tailwind v4), tokens, fonts, theme toggle, grid + overlay, layout shell, nav, footer, Lenis+GSAP setup with reduced-motion tiers, command palette skeleton, Playwright + Lighthouse CI wired up. Make the first commit only after the dev server runs cleanly.

### Phase 2 — Circuit hero + "Your turn" prompt + the wire (then PAUSE for review)
Build the circuit-type hero (§5 · 01), the C2 prompt with the instant template engine, and the first stretch of the C3 wire connecting them, including the packet handoff into the prompt underline — all exactly per DESIGN_SPEC.md §3, §4, §8 and §10, desktop and phone, driven by `design-reference/motion/hero-motion.ts`. Port `hero-motion.check.js` into the test suite and keep it passing. Run the fidelity check including the automated motion test (DESIGN_SPEC.md §9) and provide the side-by-side screenshots at 1440 and 390 in both themes, the diff percentages, the motion test results, a screen recording of the full loop, and a note on measured FPS.

### Phase 3 — Home sections
Manifesto, Selected Runs (mini traces from build-time layouts of `graph.json`), Process, Toolbox, Proof, Contact, footer wordmark — with the C3 rail continuing down the page and ticking into each section header.

### Phase 4 — Work index + Run Report template + transitions
Filterable `/work`, `/work/[slug]` from MDX, architecture-diagram component from the same `graph.json`, trace-replay component, title morph transitions.

### Phase 5 — Live agent that drives the site (then PAUSE for review)
API route, server tools over `/content`, streaming UI, rate limit, scripted fallback, then the UI tools, action registry, ghost pointer and interrupt handling (C1). Record a short screen capture of the agent opening a project.

### Phase 6 — Smart prompt + curl
The optional LLM engine for C2 with fallback, contact prefill and `get_prompt_state`. The `curl` text version with tests (C4).

### Phase 7 — Polish
Micro-interactions, 404 ("Run failed: route not found" + `↻ Retry` button that goes home), OG images, JSON-LD, llms.txt, favicon detail, about page, console message for developers.

### Phase 8 — QA
- Test each signature feature end to end: C1 (agent opens a project, interrupt works, fallback mode works), C2 (every example and the generic fallback render, the LLM engine falls back cleanly, prefill works, keyboard-only works), C3 (the wire lines up with its anchors at every width, every project has a valid `graph.json`), C4 (curl test passes in production, not only locally).
- Playwright screenshots of every page at 375, 390, 768, 1024, 1440, 1920 in both themes; review them yourself and fix anything misaligned, overflowing, or clipped.
- Lighthouse (mobile + desktop), axe-core: zero violations.
- Test reduced motion, keyboard-only, no-JS, slow 4G, Safari, Firefox, Chrome, iOS Safari, Android Chrome.
- Write `QA.md` with results and any remaining `[TODO]`s.

## 12. Working rules for Claude Code

- Commit after each meaningful step with clear messages; one PR per phase.
- Never fabricate content. Use `[TODO: …]` and add it to the Content Gaps list.
- Before building any section, re-read the relevant part of this brief **and of DESIGN_SPEC.md**.
- **Design fidelity is a hard requirement.** The owner wants the site to look exactly like the approved design. Take every size, position, color, font setting, text, timing and easing from `DESIGN_SPEC.md` and the source files in `/design-reference/source/` — never approximate or "improve" them. If something in the design seems wrong or impossible, ask the owner; do not quietly change it. Each phase ends with the fidelity check in DESIGN_SPEC.md §9.
- After building any visual piece, take Playwright screenshots and look at them before saying it's done. Judge against: *Would this look at home as an Awwwards Site of the Day? Is anything generic, misaligned, or template-looking?* Iterate until yes.
- Prefer fewer, better effects. If an effect costs usability or frame rate, cut or simplify it.
- Keep components small and typed; motion code lives in `/lib/motion`, graph code in `/components/graph`.
- If a decision isn't covered here, choose the option that is more restrained, more readable and faster — then note it in the PR description.

---

## Appendix — content the owner should prepare
- Name as it should appear, one-line positioning, city + timezone, availability status.
- 3–5 best projects: problem, what you built, stack, real results (hours saved, cost, speed, accuracy), screenshots or a 15–30s screen recording, can-the-client-be-named (y/n).
- For each project, a rough list of its steps and how they connect (e.g. "Gmail trigger → classify → look up customer in CRM → draft reply → human approves → send"). Claude Code turns this into `graph.json`.
- Toolbox: tools you actually use, grouped.
- 1–3 short testimonials (optional).
- Email, booking link, GitHub, LinkedIn, X/other.
- LLM provider + API key for the live agent (set as a server env var, never in code).
