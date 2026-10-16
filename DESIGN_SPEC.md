# DESIGN_SPEC — exact values from the approved design

This file is the **source of truth for how the site looks and moves**. Every value below was taken directly from the approved design files in `/design-reference/source/`. Copy them; do not approximate, round, or "improve" them. If anything here conflicts with `REDESIGN_BRIEF.md`, this file wins on look and motion; the brief wins on behavior, safety and architecture.

---

## 0. The design source files

`/design-reference/source/` holds the design's own code, one file per screen:

| File | Screen | Use it for |
|---|---|---|
| `HeroCombo.html` | **"Chosen — Hero A wired into prompt C"** | The hero, section 02 (Your turn), the wire between them, and all their timings. **This is the most important file.** |
| `HeroComboMobile.html` | **"Chosen — phone version"** | The same hero + section 02 on phones (§8). Same timeline, phone geometry. Ignore the "Not chosen — fluid phone" screens on the canvas. |
| `Main.html` | "Home — day shift" (night = same file with `theme: "night"`) | Nav, manifesto, selected runs (incl. the hovered row + agent ghost pointer), agent terminal, footer. **Ignore its old graph hero** (the top section up to the first `<section aria-labelledby="manifesto-h">`). |
| `RunReport.html` | "Run report — day / night" | The case-study page. |
| `Mobile.html` | "Home — phone" | Phone patterns only (nav with Menu button, stacked run cards, bottom "Ask the agent" bar). **Its hero is the old graph hero — do not build it.** See §8. |

`/design-reference/motion/` holds the motion, ready to use:
- **`hero-motion.ts`** — the design's animation logic as a typed module: every timing, easing, packet point (desktop and phone), template, and a `stateAt(example, elapsedMs)` function that returns the exact state at any millisecond. **Import and use it as-is** (§10).
- **`TIMELINE.md`** — the same thing as a readable, millisecond-by-millisecond table of the four loops.
- **`hero-motion.check.js`** — 28 expectations proving the module matches the design. Port them into the project's tests and keep them green.

**How to read them:** they are written in a small design-component format. Markup is normal HTML with inline styles. `{{name}}` is a value computed in the `<script type="text/x-dc">` at the bottom of each file — read the `renderVals()` function there to see what each `{{…}}` becomes. Timers and the animation state machine are in the same script (`componentDidMount`, `circuit()`, `prompt()`). `<sc-for list="{{items}}" as="item">` repeats its content for each item; `<sc-if value="{{x}}">` shows its content when `x` is true. Treat these files as the visual reference to reproduce in React — do not ship them.

All coordinates below are on the design's **1440 px wide** desktop frame.

---

## 1. Tokens (exact)

```css
/* night shift — DEFAULT */
--paper:       #0C0C0B;
--paper2:      #141413;   /* hero run panel, prompt node boxes */
--paper2-alt:  #161614;   /* home: hovered run row, terminals (from Main/RunReport) */
--ink:         #ECE9E2;
--ink2:        #B5B2AA;
--muted:       #8C8980;
--muted-raised:#8C8980;   /* muted text on --paper2 surfaces (owner decision, 2026-10-15) */
--line:        rgba(236, 233, 226, 0.12);
--line-strong: rgba(236, 233, 226, 0.28);  /* 0.30 on home/run report */
--ok:          #3DBA6F;
--ok-ring:     rgba(61, 186, 111, 0.22);
--signal:      #FF4F1A;
--signal-soft: #FF4F1A33;  /* signal at 20% alpha */

/* day shift */
--paper:       #EDEAE3;
--paper2:      #E5E1D8;   /* hero/prompt */
--paper2-alt:  #E3DFD6;   /* home/run report */
--ink:         #0E0E0C;
--ink2:        #3B3A36;
--muted:       #6A675F;
--muted-raised:#64615A;   /* muted text on --paper2 surfaces: 4.73:1 (owner decision, 2026-10-15; #6A675F was 4.33:1) */
--line:        rgba(14, 14, 12, 0.14);
--line-strong: rgba(14, 14, 12, 0.30);   /* 0.32 on home/run report */
--ok:          #2E9B5A;
--ok-ring:     rgba(46, 155, 90, 0.20);
--signal:      #FF4F1A;

/* terminals (both themes) */
--term:        #121210 (day) / #161614 (night);
--term-ink:    #ECE9E2;
--term-muted:  #9A978E;
```
Text on a `--signal` fill is always `#0E0E0C`. `--signal` is never used for text.

**Accessibility amendments (owner decision, 2026-10-15).** Muted text on raised `--paper2` surfaces (the live run panel, the prompt node boxes, and on the home page the hovered row and terminals) uses `--muted-raised`. The timestamp of the highlighted (newest) log row uses `--ink2` instead of `--muted` (the muted colour on the highlight was 4.13:1 night / 3.51:1 day). Every text/background pair meets WCAG AA.

**Fonts** (self-hosted via `next/font`; Geist and Geist Mono from the full files in Vercel's `geist` package, so the arrows → ↵ render in Geist on every OS — owner decision, 2026-10-15; Instrument Serif from Google Fonts):
- `Geist` 300–700 — display and UI. Body copy uses weight 400; headlines 600 (hero) / 500 (section titles).
- `Geist Mono` 400–600 — labels, logs, tags.
- `Instrument Serif` italic 400 — the italic phrases only.
- Root: `-webkit-font-smoothing: antialiased`.

**Mono label style (used everywhere):** 11–12px, `letter-spacing: 0.06–0.08em`, `text-transform: uppercase`, color `--muted` (or `--ink` when active).

---

## 2. Page frame and nav

- Side margins: **64px** at 1440 (fluid pages use `clamp(16px, 4.4vw, 64px)`).
- **Nav (all pages):** height 64px, `border-bottom: 1px solid var(--line)`. Use the **full nav from `Main.html`** on every page (the hero screen shows a shortened one; the full one wins):
  - Left: 10×10 `--signal` square + name, Geist 600 15px, gap 10px.
  - Center: mono 12px uppercase links with muted index numbers: `01 Work · 02 Agent · 03 About · 04 Contact`, gap 28px.
  - Right: `[CITY] 19:42` (muted, live local time), green LED (8px circle, `--ok`, 3px `--ok-ring` halo) + "Available for projects", theme toggle button (min-height 44px, 1px `--line` border, half-filled circle icon + "Night shift" / "Day shift").

---

## 3. Hero — "Circuit type" (from `HeroCombo.html`)

Desktop composition is designed on a **1440 × 900** stage. **Implementation rule:** build the hero as a fixed-coordinate stage of 1440×900 and scale it uniformly to the viewport width for widths **1024–1920px** (e.g. a wrapper with `--s: calc(100vw / 1440)` and every px value multiplied by it, or a single `transform: scale()` on a 1440-wide stage with height compensated). This keeps every position exactly as designed. Below 1024px use the phone layout (§8).

### 3.1 Headline lines (absolute positions, top-left of each line's box)
| Line | Text | left | top | Font |
|---|---|---|---|---|
| 1 | `I build` | 150 | 128 | Geist 600, 132px, `letter-spacing: -0.05em`, `line-height: 1` |
| 2 | `agents` | 300 | 262 | same |
| 3 | `that do` | 450 | 396 | same |
| 4 | `the work.` | 600 | 520 | Instrument Serif italic 400, **150px**, `letter-spacing: -0.025em` |

All lines `white-space: nowrap`. The `<h1>` wraps all four.

**Tags** above each line: mono 11px, weight 400, `letter-spacing: 0.08em`, `--muted`, positioned `left: 4px; top: -14px` relative to the line (line 4: `left: 6px; top: 6px`). Text: `01 TRIGGER · {status}`, `02 PLAN · {status}`, `03 ACT · {status}`, `04 SHIP · {status}`, where status is `queued` / `running` / `done`.

**Line states:**
- pending: `color: transparent; -webkit-text-stroke: 1.25px var(--line-strong)`
- running or done: `color: var(--ink); -webkit-text-stroke: 0`
- transition: `color 0.5s, -webkit-text-stroke-color 0.5s`

### 3.2 Wires and nodes (one SVG, 1440 × 1840 covering hero + prompt)
Copy these paths exactly:
```
guides (stroke --line, 1px, dasharray 2 6):  M150 100 V730 | M300 100 V730 | M450 100 V730 | M600 100 V730
input wire (always --ink, 1.5px):            M0 198 H105
seg0  node1→node2:                           M110 203 V332 H255
seg1  node2→node3:                           M260 337 V466 H405
seg2  node3→node4:                           M410 471 V600 H555
segOut node4→shipped:                        M560 605 V700 H1394
segRail shipped→prompt underline:            M1400 706 V1300 H1376
```
Wire stroke 1.5px, `fill: none`, color `--line-strong` until the packet has passed, then `--ink` (`transition: stroke 0.4s`; rail 0.5s).

Node squares 12×12, stroke 1.5px, at `x,y`: (104,192) (254,326) (404,460) (554,594); "shipped" node at (1394,694).
Node states: done = fill+stroke `--ink`; running = fill+stroke `--signal`; pending = fill `--paper`, stroke `--line-strong`. `transition: fill 0.3s, stroke 0.3s`.

Label at the shipped node: `SHIPPED · NEXT RUN IS YOURS ↓`, mono 11px, `letter-spacing: 0.06em`, right-aligned at x=1380, baseline y=684, `--muted`.

### 3.3 The packet
10×10 `--signal` square with `box-shadow: 0 0 0 4px var(--signal-soft)`, centered on these points, one per step:

| Step | Point (x, y) | Travel time to reach it |
|---|---|---|
| 0 | 110, 198 | — (start, no transition) |
| 1 | 110, 332 | 0.5s |
| 2 | 260, 332 | 0.5s |
| 3 | 260, 466 | 0.5s |
| 4 | 410, 466 | 0.5s |
| 5 | 410, 600 | 0.5s |
| 6 | 560, 600 | 0.5s |
| 7 | 560, 700 | 0.45s |
| 8 | 1400, 700 | 0.8s |
| 9 | 1400, 1299 | 0.85s |
| 10 | 86, 1299 (the `›` of the prompt) | 1.05s |

Easing for every move: `cubic-bezier(0.65, 0, 0.35, 1)`.
**Hold time at each step before moving on (ms), steps 0–9:** `[1400, 480, 1400, 480, 1400, 480, 1400, 620, 900, 900]`. Step 10 has **no hold**: the prompt starts typing at the very instant step 10 begins, *while* the packet is still sliding along the underline (1.05s). (The design file lists a value of 1100 for step 10, but it is never used in the loop.)
Line *n* (0-based) is `running` when step = 2n, `done` when step > 2n. Wire *n→n+1* lights as soon as step > 2n (i.e. when the packet *leaves* node *n*), out-wire at step ≥ 7, rail at step ≥ 9, underline and `›` at step 10.
**Absolute times for every change are in `motion/TIMELINE.md`** (e.g. step 2 at 1880ms, SHIPPED at 7660ms, typing starts at 9460ms).

### 3.4 Live run panel
Position left 1010, top 112, width 366. Border 1px `--line`, background `--paper2`, mono 12px.
- Header: padding 10px 14px, border-bottom `--line`, 11px uppercase `letter-spacing 0.08em` `--muted`. Left: 7×7 `--signal` square + `LIVE RUN · DEMO` in `--ink`. Right: `step {n} / 4` or `complete · 8.2s`.
- Body: padding 8px 0, min-height 168px. Rows: grid `92px 58px 1fr`, gap 10px, padding 6px 14px, line-height 1.45. Past rows `--ink2`; newest row `background: var(--signal-soft); box-shadow: inset 2px 0 0 var(--signal); color: var(--ink)`, its timestamp `--ink2` (accessibility amendment, §1). Muted text in the panel uses `--muted-raised`.
- Rows appear at steps 0, 2, 4, 6, 8:
```
14:02:11.004  trigger  request · "Reconcile March invoices"
14:02:11.630  plan     3 steps · 2 tools · 1 check
14:02:13.902  act      sheets → ledger · 41 rows matched
14:02:19.247  ship     verified · report sent to #finance
14:02:19.250  done     8.2s · 0 errors · next run: yours ↓
```

### 3.5 Bottom row
- Sub-line: left 64, top 772, width 410, Geist 18px/1.5, `--ink2`: "I design, build and run AI agents and automations for teams that are done doing the same work twice."
- Buttons: left 560, top 776, gap 14px.
  - Primary "Start a project →": min-height 52px, padding 0 22px, `--ink` background, `--paper` text, Geist 500 15px, square corners.
  - Secondary "Try it on your task ↓": min-height 52px, padding 0 20px, 1px `--line-strong` border, `--ink` text.
- Stats: left 1010, top 768, width 366, mono 12px uppercase `letter-spacing 0.06em`; two rows (padding 9px 0, top borders `--line`, last row also bottom border): `Agents in production [N]`, `Hours automated / yr [N]` (label `--muted`, value `--ink`).

---

## 4. Section 02 — "Your turn" (from `HeroCombo.html`)

Same 1440-wide stage, continuing below the hero (frame height 1840).
- **Section header:** left/right 64, top 984; mono 12px uppercase, padding-bottom 14px, border-bottom `--line`. Left `02 — Your turn`, right (muted) `Describe a task · see the system I would build`.
- **Kicker:** left 64, top 1052, Instrument Serif italic 40px, `letter-spacing -0.01em`, `--ink2`: "That was one of mine. Now yours."
- **Headline (h2):** left 64, top 1106, Geist 600 108px, `letter-spacing -0.05em`, line-height 0.9, nowrap: "What should *run itself?*" — the italic part Instrument Serif 400, `font-size: 1.08em`, `letter-spacing -0.02em`.
- **Input row:** left/right 64, top 1212, height 88, flex, gap 18px, `border-bottom: 2px solid` — `--line-strong` until the packet arrives (step 10), then `--ink` (`transition 0.6s`). This underline *is* the end of the wire.
  - `›` mono 30px: `--muted` → `--signal` when lit.
  - Input: Geist 400 34px, `letter-spacing -0.02em`, height 60, transparent, no border, `caret-color: var(--signal)`, placeholder "Describe something your team does by hand…".
  - Button "Generate ↵": min-height 48px, padding 0 18px, `--ink` bg, `--paper` text, mono 12px uppercase `letter-spacing 0.08em`.
- **Chips row:** top 1316, gap 10px. Label `TRY` mono 11px muted. Chips: min-height 40px, padding 0 14px, 1px `--line-strong` border, mono 12px; selected chip: border `--ink`, background `--paper2`. Chips: `Invoices → ledger`, `Refund emails`, `Monday KPI report`, `Lead research`.
- **Status row:** top 1420, mono 11px uppercase, padding-bottom 12px, border-bottom `--line`. Left: 7×7 `--signal` square + status in `--ink`. Right: summary in `--muted`.
- **Node row:** padding-top 32px; grid `1fr 44px 1fr 44px 1fr 44px 1fr 44px 1fr`, `align-items: center`.
  - Node box: min-height 128, padding 16px 16px 18px, background `--paper2`, gap 14px. Top line mono 10px uppercase `letter-spacing 0.1em` `--muted`: mark + kind on the left, `01`–`05` on the right. Title Geist 500 21px, `letter-spacing -0.02em`, line-height 1.15.
  - Marks (8×8): Model = filled circle; Trigger/Schedule = filled square rotated 45° and scaled 0.8; Code/Tool = filled square; Human = hollow square (1px border). Active mark = `--signal`.
  - Box borders: active `1.5px solid --signal` + `box-shadow: 0 0 0 4px var(--signal-soft)`; done `1px solid --ink`; otherwise `1px solid --line-strong`; Human boxes dashed (unless active).
  - Reveal: hidden = `opacity 0.12; transform: translateY(10px)` → shown = `opacity 1; translateY(0)`, `transition 0.45s cubic-bezier(0.16, 1, 0.3, 1)`.
  - Connectors: 1.5px `--ink` lines, `transform-origin: left`, `scaleX(0)` → `scaleX(1)` in 0.35s `cubic-bezier(0.16, 1, 0.3, 1)`. A 6×6 `--signal` packet sits at the right end of the connector leading into the active node.
- **CTA bar:** left/right 64, top 1700, padding-top 22px, border-top `--line`. Left text Geist 16px/1.5 `--ink2`, max 54ch: "This is how I start every project: map the work, decide where a model helps, where code is safer, and where a person stays in the loop." Right: "See real runs" (outlined) and "Build this with me →" (primary), both min-height 52px.

**Status texts:** `Waiting for your task` · `Listening` (typing) · `Designing the system · n / 5` · `Test run · step n / 5` · `Ready to build` · `Next example` (erasing). **Summary:** `The system appears here` when empty, otherwise `5 steps · {m} model(s) · {h} human check(s)` (+ ` · drafted from your words` for the generic template).

**Prompt timings (ms):** typing a character `34 + (currentLength % 5) * 9`; pause after typing `420`; reveal each node `240`; pause before test run `200`; each test-run step `520`; hold the finished result `2200`; erase 2 characters per `12`; pause after erasing `200`. When the visitor triggers it: reveal `200`, pause `160`, test-run step `480`, settle `600`.

**Templates (exact):**
| Chip | Prompt | Nodes (kind — title) |
|---|---|---|
| Invoices → ledger | Reconcile invoices from Gmail into our accounting tool | Trigger — Invoice email arrives · Model — Extract the fields · Code — Match to purchase orders · Human — Check if unsure · Tool — Post to the ledger |
| Refund emails | Answer refund emails and escalate the angry ones | Trigger — Support inbox · Model — Read intent and mood · Tool — Look up the order · Model — Draft the reply · Human — Escalate if upset |
| Monday KPI report | Every Monday, send a KPI summary to Slack | Schedule — Monday 09:00 · Tool — Pull the metrics · Model — Write the summary · Code — Sanity-check numbers · Tool — Post to #ops |
| Lead research | Research new leads and add them to the CRM | Trigger — New form lead · Tool — Search the company · Model — Score the fit · Tool — Enrich the CRM record · Tool — Notify sales |
| (no match) | — | Trigger — When it happens · Model — Understand the input · Code — Apply your rules · Tool — Do the work · Human — Approve the result |

Keyword matching: invoice/receipt/bill/accounting/ledger/xero/quickbooks → 1; refund/support/ticket/reply/customer/complain/inbox → 2; report/kpi/weekly/monday/summary/metric/dashboard → 3; lead/crm/sales/prospect/hubspot/salesforce → 4.

**The full loop (exactly as the design):** hero run (steps 0–8) → packet travels down to the prompt (steps 9–10) → underline and `›` light up and the prompt starts typing example *k* at the same instant → builds, test-runs, holds, erases → hero restarts at step 0 (packet jumps back with no transition) → next time, example *k+1*. One loop takes 18.1–18.9s depending on the example; all four take 73.7s.

**Details that are easy to miss (all in the design, all required):**
- **Ghosts.** The five boxes are always in place. Whenever they are not revealed, they show at **opacity 0.12, shifted down 10px** — including their titles. During the hero run the ghosts already show the *upcoming* example's titles.
- **Erase fades the boxes back.** While erasing, `revealed = min(revealed, ceil(textLengthBeforeTick / 12))` — the boxes return to ghosts one by one from the last, as the text shrinks.
- **Selected chip.** The chip of the example currently playing is shown selected (border `--ink`, background `--paper2`).
- **Connector packet.** During the test run, the 6×6 packet appears at the *end* of the connector leading into the active box (opacity 0→1 in 0.2s, no travel).
- **Underline state.** Lit from step 10 through typing, building, running and erasing; dim again at restart (step 0). After the visitor takes over, it stays lit. When the visitor clicks into the input, types, or picks a chip, prompt autoplay stops for good; the hero keeps looping on its own (2.4s rest between runs; if the visitor takes over while the hero is resting at the prompt, it restarts after 1.6s). Pause everything when both sections are off-screen or the tab is hidden.

**Reduced motion:** hero at step 10 (all lines filled, all wires lit), prompt shows the first template finished, no packet movement.

---

## 5. Home sections below (from `Main.html`)

Section order and numbering follow the brief (03 Manifesto, 04 Selected runs, … ). Styles:

- **Section header:** mono 12px uppercase `letter-spacing 0.08em`, padding-bottom 14px, border-bottom 1px `--line`; title left, count/meta right in `--muted`.
- **Manifesto:** section padding 88px 0 120px. Text margin-top 64px, `max-width: 24ch`, Geist 500 `clamp(36px, 4.7vw, 68px)`, `letter-spacing -0.035em`, line-height 1.04, `text-wrap: balance`. The last sentence starts `--muted` (scrubs to `--ink` on scroll), with "trusts." in Instrument Serif italic.
- **Selected runs table:** columns `112px minmax(0,1.35fr) minmax(0,1fr) minmax(0,0.8fr) 200px 56px`, gap 24px. Column labels mono 11px uppercase muted, padding 14px 0. Rows padding 30px 0, border-bottom `--line`. Run ID mono 12px muted; project name Geist 500 40px `letter-spacing -0.035em` line-height 1; outcome 15px/1.45 `--ink2`; stack mono 12px `--ink2`; status LED 8px + mono 12px; year mono 12px right-aligned.
- **Hovered/agent-highlighted row:** columns `112px 1fr 360px`, gap 24px, padding 28px 20px, margin 0 -20px, background `--paper2-alt`. Name 52px with a 14×14 `--signal` square before it (gap 16px). Outcome 16px/1.5 max 52ch. Mini trace: mono 11px, 8×8 nodes, 44px connectors (margin 0 10px), packet 6×6 `--signal` 18px into the second connector, current node `--signal`, pending connector `--line-strong`, last node hollow + muted. Media box: height 202px, 1px `--line-strong` border, background `repeating-linear-gradient(135deg, var(--line) 0 1px, transparent 1px 11px)`, mono 11px labels `LOOP · MUTED` / `00:07 / 00:15`, centered `[Screen recording of the system]`, 2px progress bar at 46%. Ghost pointer: 22×24 arrow, fill `--signal`, 1.5px `--paper` stroke, label pill `agent · highlight_project` (padding 3px 7px, `--signal` bg, `#0E0E0C` text, mono 11px), at left 47% / top 52px of the row.
- **"All runs [n] →"** link: right-aligned, mono 12px uppercase, 1px `--ink` bottom border, min-height 44px.
- **Talk to my agent:** two columns (flex 1 1 380px / 1.4 1 520px, gap 48px, padding-top 56px). Left: h2 Geist 500 `clamp(36px, 4vw, 58px)` "Ask it about my work. It will *show* you.", body 17px/1.55 max 42ch, four chips (first one filled `--ink`). Right: terminal (`--term` bg, `--term-ink` text): header bar mono 11px uppercase (`AGENT · SESSION 3F2A` / 7px `--signal` square + `ACTING ON THE PAGE`), body padding 22px 18px 24px mono 13px/1.6, user bubble right-aligned with 1px border, tool rows padding 7px 10px on `rgba(236,233,226,0.05)` with 6×6 status squares (done = `--term-ink`, running = `--signal`, queued = hollow), answer in Geist 16px/1.55 with an 8×17 `--signal` block cursor, input row with "Send ↵" button (`--term-ink` bg, `#0E0E0C` text).
- **Footer:** border-top `--line`, padding-top 24px. Closing line Geist 500 `clamp(40px, 5vw, 76px)` "Have work that should *run itself?*", email link 22px underlined (offset 6px), "▶ Start a run" button (mono 13px uppercase, `--signal` triangle). Wordmark: Geist 600 **15.2vw**, `letter-spacing -0.065em`, line-height 0.78, nowrap, overflow hidden. Bottom row mono 11px uppercase muted: `© 2026 [NAME]` · socials · `Try curl [domain]` · `Built with a few agents helping`.

## 6. Run report (from `RunReport.html`)
Follow the file for every value. Key ones: breadcrumb row mono 11px; title Geist 600 `clamp(56px, 8.6vw, 136px)`, `letter-spacing -0.05em`, line-height 0.9, max 14ch; lead `clamp(22px, 2.2vw, 32px)` `--ink2` max 34ch; facts grid 5 columns with a 1px `--ink` top border; system diagram grid `1fr 64px 1fr 64px 1fr 64px 1fr` × rows `auto 72px auto` with the dashed "confidence < 0.9" branch to the Human box; trace terminal rows `116px 92px 1fr`; results numbers `clamp(56px, 7vw, 104px)` `letter-spacing -0.055em`; "Next run" link `clamp(44px, 5.4vw, 80px)` with a 1px `--ink` top border.

## 7. Things the design does NOT show (use the brief, keep the same visual language)
Command palette, mobile menu, 404, contact form fields, toast, `/work` index, about page. Build them from the same tokens, type styles, borders and mono labels. Show the owner screenshots before considering them done.

## 8. Phones — hero + section 02 (from `HeroComboMobile.html`)

Designed on a **390px** wide frame — the owner's chosen phone style.

**How it adapts to different phones:** build sections 01–02 as a fixed-coordinate **390-wide stage** and scale it **uniformly with the screen width** (`--s: calc(var(--w) / 390)`, every px value multiplied by it), exactly like the desktop rule. Everything keeps the same proportions on every phone:
- **Phones (viewport width < 600px):** `--w` = viewport width. A 360px Android shows it at 92%, a 375px iPhone SE at 96%, a 430px Pro Max at 110%. Supported down to 320px (82%).
- **Tablets and small laptops (600–1023px):** the 390 stage at `--w` = min(viewport width, 560px), centered. The desktop stage starts at 1024px.
- Same timeline and `hero-motion.ts`; use `PACKET_POINTS.mobile` (multiplied by the same scale).
- **Note on the first screen:** in this style the two stacked buttons sit just below the first screen on most phones (their bottom is at 862px × scale); the headline, the live log and the sub-line are visible first. This is accepted as designed.

**Nav:** height 56, side padding 16. Name (9×9 `--signal` square, Geist 600 15px), then on the right a green LED (8px, `--ok-ring` 3px) and a "Menu" button (min-height 44, padding 0 12px, 1px `--line` border, mono 11px uppercase, two 14×1px bars).
**Meta row:** top 68, mono 10px uppercase muted: `AI agents & automation` · `Online · [CITY] 19:42` ("Online" in `--ink`).

**Staircase headline** (Geist 600 **50px**, `letter-spacing -0.05em`, line-height 1; line 4 Instrument Serif italic **58px**, `-0.025em`):
| Line | left | top | node centre |
|---|---|---|---|
| `I build` | 44 | 128 | 22, 155 |
| `agents` | 72 | 206 | 50, 233 |
| `that do` | 100 | 284 | 78, 311 |
| `the work.` | 128 | 356 | 106, 389 |
Tags: mono **9px**, `letter-spacing 0.08em`, at `left: 2px; top: -12px` (line 4: `left: 3px; top: 0`). Pending outline stroke **1px** (desktop 1.25px). Node squares **10×10**. Dashed guides at x = 44, 72, 100, 128 from y 110 to 430 (dash `2 5`).

**Wires (SVG 390 × 1970):**
```
input:   M0 155 H17
seg0:    M22 160 V233 H45
seg1:    M50 238 V311 H73
seg2:    M78 316 V389 H101
segOut:  M106 394 V446 H377
rail:    M382 451 V1283 H374     (runs down the RIGHT margin, 8px from the edge)
```
SHIPPED node 10×10 at (377, 441); label `SHIPPED · YOURS ↓`, mono 9px, right-aligned at x 368, baseline 434.
Packet **8×8**, glow `0 0 0 3px var(--signal-soft)`; points = `PACKET_POINTS.mobile`; same durations and easing as desktop.

**Live run panel:** left 16, top 470, width 350; header padding 8px 12px, mono 10px (6×6 signal square, `LIVE RUN · DEMO`, right `step n / 4` or `done · 8.2s`). Body: fixed height **132px**, content aligned to the bottom, overflow hidden, showing only the **last 3 rows**; rows grid `74px 46px 1fr`, gap 8, padding 5px 12px, mono 10.5px/1.45, times shortened to one decimal (`14:02:11.0`). Newest row highlighted as on desktop.

**Below the panel:** sub-line top 656, width 350, Geist 16px/1.5 `--ink2`. Buttons top 748, full width (350), stacked, gap 10, min-height 52, label left and arrow right: "Start a project →" (filled), "Try it on your task ↓" (outlined). Stats top 884, mono 11px, two rows padding 10px 0.

**Section 02:** header top 1004 (`02 — Your turn` / `Try it`, mono 11px, width 350). Kicker top 1040, Instrument Serif italic **24px**. Headline top 1080, Geist 600 **52px**, line-height 0.92, on **two lines**: "What should" / "*run itself?*" (italic 1.08em). Input row top 1220, height **64**, gap 10: `›` mono 22px, input Geist **20px** (placeholder "Describe a task…"), and a square **44×44** "↵" Generate button (`--ink`). The row's 2px bottom border is where the rail ends (y 1283). Chips: top 1298, one horizontally scrolling row (padding 0 16px, gap 8, chips min-height 44, mono 11px). Status row top 1360, mono 10px, with **short texts**: `Designing · n / 5`, `Test run · n / 5`, etc. and summary `5 steps · n human check(s)` (or `—` when empty). Nodes: top 1400, **stacked vertically**; box min-height 64, padding 12px 14px, gap 8px, kind line mono 9px, title Geist 500 17px/1.2; connectors are **vertical** 1.5×16px lines, 18px from the left, drawing with `scaleY` from the top (0.35s), packet 6×6 at the bottom end of the connector into the active box. CTA top **1828** (28px clear of the fifth box and its highlight ring): "Build this with me →" full width (min-height 52) and a centered underlined "See real runs" link (min-height 44).

Other sections on phones follow `Mobile.html` patterns (stacked run cards with media on top, bottom "Ask the agent" bar).

## 9. Fidelity check (required at the end of every phase that touches visuals)
1. Add a dev-only query param `?freeze=<state>` that renders deterministic states without animation: `hero-start` (step 0), `hero-done` (step 10, prompt lit, empty), `prompt-done` (template 1 finished), `home-hover` (row RUN #011 highlighted with ghost pointer), and the run report.
2. With Playwright, screenshot each state at **1440×900** (and the full 1440-wide page) and at **390×844** (and the full 390-wide page) in **night** and **day**; also screenshot at **360×740** and **430×932** and check the layout is the same design scaled (§8).
3. Put each screenshot next to the owner's reference screenshot from `/design-reference/` and compare. Also produce an overlay diff (e.g. `pixelmatch`) and report the mismatch percentage per state.
4. Positions must be within **2px**, font sizes/weights/letter-spacing/colors **exact**, all texts identical. Fix every difference before reporting the phase as done.
5. **Motion test (automated, required).** Use Playwright's clock control (`page.clock.install()` then `runFor()`) so time is deterministic. For each example loop, advance to every timestamp listed in `motion/TIMELINE.md` and assert that the DOM matches `deriveVisuals(stateAt(k, t))`: each line's status, each node's fill, each wire's lit state, log rows, underline/`›` state, typed text, revealed and active boxes, status and summary texts. After each packet move has finished (timestamp + its duration), assert the packet's centre is within **1px** of `PACKET_POINTS.desktop[step]` (desktop) or `PACKET_POINTS.mobile[step]` × the phone scale (phones). Run at 1440 and 390 widths.
6. Record a screen capture of the full 73.7s cycle and compare it with the owner's recording in `/design-reference/` if provided.

## 10. Implementing the motion (required approach)
- **Use `motion/hero-motion.ts` as-is** for every timing, easing, point and text. Do not retype or "tidy" the numbers.
- **Drive it with one pausable clock**, not chained `setTimeout`s: a `requestAnimationFrame` loop accumulates elapsed time while the hero or prompt is in view and the tab is visible; each frame call `stateAt(k, elapsed)`; when `elapsed >= loopDuration(k)`, move to example `(k + 1) % 4` and reset elapsed to 0. Only re-render when the state actually changes.
- **In-between motion is CSS transitions** with the exact values in `TRANSITIONS`, plus the packet: when `step` changes, tween the packet to `PACKET_POINTS.desktop[step]` (or `PACKET_POINTS.mobile[step]` × the phone scale on phones) over `PACKET_MOVE_S[step]` seconds with `PACKET_EASE`; when `jump` is true, set it instantly (no transition). The packet moves in straight lines between consecutive points — the points are the wire's corners, so it always follows the wire.
- **Visitor takeover** (focus, typing, chip, Generate): stop the prompt's automatic loop permanently; the prompt then follows `PROMPT_MS.user` timings for the visitor's builds; the hero keeps looping on its own, resting `heroRestAfterTakeover` (2400ms) at step 10 between runs, or restarting after `heroRestartAfterTakeoverAtPrompt` (1600ms) if the takeover happened while it was resting there.
- **Reduced motion:** render `REDUCED_MOTION_STATE` with all transitions disabled.
- **Freeze states for tests** (§9): `hero-start` = `stateAt(0, 0)`, `hero-done` = `stateAt(0, 9460)` after transitions settle, `prompt-done` = `stateAt(0, 16150)` after transitions settle.
