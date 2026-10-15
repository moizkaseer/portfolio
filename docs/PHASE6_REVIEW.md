# Phase 6 review — smart prompt, curl version, demo answers from content

Branch `phase-6-prompt-curl` (on top of `phase-5-agent`). Paused here for the owner's review.

> **Note:** the Phase 6 instructions arrived cut off at "B. … Use a". I implemented the brief's C4 test requirement as the missing item ("request with a curl user agent → text/plain, contains the name and an email; request with a browser user agent → HTML"). Tell me if you meant something else.

## Demo answers now come from the content files (Phase 5 review)
Every fact in the agent's demo replay is read from the content files the site renders — never written into the answer — so placeholders show until you fill them in:

| Fact | Source |
|---|---|
| name, city, timezone, availability, the "what I build" sentence | `content/site.json` (`name`, `city`, `timezone`, `availability.label`, new `summary` — the hero's sub-line now reads from it too) |
| projects, "best project" | `content/projects/*/index.mdx` → build-time index `lib/content/projects.generated.json`; the best project is the one with **`featured: true`** in its frontmatter (placeholder: the invoice pipeline, as the design highlights RUN #011 — marked `[TODO: confirm]`) |
| tools | `content/toolbox.json` |
| how agents stay reliable | your approved Process copy (`content/process.json`: Plan + Verify) |
| the visitor's system | what they built in "What should run itself?" (`get_prompt_state`) |

The answers live in `lib/agent/replay-script.ts` as functions of that content; `tests/unit/replays.test.ts` proves it (with made-up content, every answer that states a fact changes when the content changes). New answers: **location** and **the visitor's system**.

### Every demo answer, full text (with the current content)
Reply with any wording you want changed. Regenerate this list with `GEN_ANSWERS=out.md npx vitest run tests/unit/answers.gen.test.ts`.

### best-project

Triggered by: `best|show me|impress|favou?rite|top project|strongest`

- trace: `search_projects(sort: "impact")` · 142ms · 4 results
- action: `ui_scroll_to({"section":"work"})`
- action: `ui_highlight_project({"slug":"invoice-extraction-pipeline"})`

> This is RUN #011, [Invoice extraction pipeline]. I have highlighted it on the page and I am opening the full run report next.

- action: `ui_open_project({"slug":"invoice-extraction-pipeline"})`

### your-system — before the visitor builds anything

Triggered by: `build this|could you (really )?build|can you build|my system|the system i|what i (built|described|typed)|this system`

- trace: `get_prompt_state()` · nothing built yet
- action: `ui_scroll_to({"section":"your-turn"})`

> Describe a task in "What should run itself?" first — then I can talk about the system it sketches.


### your-system — after building the “Monday KPI report” example

Triggered by: `build this|could you (really )?build|can you build|my system|the system i|what i (built|described|typed)|this system`

- trace: `get_prompt_state()` · 5 steps
- action: `ui_prefill_contact({"summary":"Every Monday, send a KPI summary to Slack"})`

> You described: "Every Monday, send a KPI summary to Slack". The sketch has 5 steps — Monday 09:00 → Pull the metrics → Write the summary → Sanity-check numbers → Post to #ops — with 1 model step and 0 human checks. Whether [YOUR NAME] would build it this way is a question for [YOUR NAME]: I've put it in the contact form so you can send it.


### theme — from night shift

Triggered by: `dark|light|night|day shift|theme`

- action: `ui_set_theme({"theme":"light"})`

> Done — switched the site to day shift.


### theme — from day shift

Triggered by: `dark|light|night|day shift|theme`

- action: `ui_set_theme({"theme":"dark"})`

> Done — switched the site to night shift.


### tools

Triggered by: `tool|stack|tech|use\b|integrat`

- trace: `get_toolbox()` · 38ms · 4 groups
- action: `ui_highlight_tools({"names":["[Orchestrator]","[Model]"]})`

> Orchestration: [Orchestrator] and [Scheduler]. Models: [Model]. Data: [CRM], [Sheets], [Search] and [Accounting API]. Surfaces: [Slack]. Hover a tool to see which runs used it.


### reliability

Triggered by: `reliab|trust|safe|guardrail|fail|wrong|error|hallucin`

- trace: `get_case_study()` · 121ms
- action: `ui_scroll_to({"section":"process"})`

> The agent decides what needs doing and which tools it may use. Limits come first, so it never wanders. Every result is checked by code or a second model. When it is unsure, it stops and asks a person instead of guessing.


### location

Triggered by: `where|based|locat|city|country|time ?zone`

- trace: `get_availability()` · 64ms

> [YOUR NAME] is based in [CITY] (Europe/Skopje time).


### availability

Triggered by: `availab|hire|book|start|work with|contact|email|reach`

- trace: `get_availability()` · 64ms
- action: `ui_scroll_to({"section":"contact"})`

> Available for projects. Describe the task in the form here and it reaches [YOUR NAME] directly. I won't send anything for you.


### what-you-build

Triggered by: `build|what do you|services|offer|do you do`

- trace: `search_projects()` · 98ms · 4 results
- action: `ui_scroll_to({"section":"work"})`

> I design, build and run AI agents and automations for teams that are done doing the same work twice. The runs on this site: [Support inbox agent], [Invoice extraction pipeline], [Lead research agent] and [Weekly ops report].


### price

Triggered by: `price|cost|rate|budget|how much|€|\$`


> I don't know — ask [YOUR NAME] directly through the contact form.


### fallback

Triggered by: `$^`


> This is a demo replay with a few recorded answers — try one of the suggestions, or ask about the best project, reliability, tools, availability or the system you just built. The live agent can answer anything about the work once it's switched on.


## A. Smart prompt — "What should run itself?" (C2)
- **The instant template engine stays the default** and needs no keys: keyword templates, the generic fallback, the chips — unchanged.
- **With a model configured** (the same `AGENT_MODEL` / provider key as the agent), Enter or Generate on the visitor's own words calls **`/api/prompt`**: `generateText` + `Output.object` with a zod schema — exactly 5 nodes, kinds limited to Trigger · Schedule · Model · Code · Tool · Human, short titles — rate-limited like the agent (12 per IP per hour), 2.5s timeout. While it drafts, the status reads "Designing the system · 0 / 5". **Any error, invalid answer or more than 2.5s → the templates, silently.** The drafted steps show with their kinds' marks, the Human step dashed, and the summary "… · drafted from your words". Chips stay instant examples (no server call).
- **Home budget**: the smart engine's code (`lib/prompt/smart.ts`) loads on first focus of the input, and only when a model is configured. The initial load gained only a small hook. To make room, the decorative scroll pieces (the C3 rail, the manifesto scrub, the footer wordmark scrub) now load after the page is idle. **Home: 189.3KB** (≤ 190KB, enforced by the test).
- **"Build this with me →"** prefills "What should be automated?" with the visitor's sentence plus the steps in plain language ("1. New supplier email (trigger) …"), and the steps as JSON in the hidden `system` field — with smart or template steps.
- **`get_prompt_state`**: the browser sends the visitor's last built system with every agent request; the server validates it (zod) and exposes it as a read-only tool, so the live agent can talk about "this system". The demo replay has the matching answer (above), which also prefills the contact form — it never submits it.

## B. curl version (C4)
- `curl`, `Wget`, `HTTPie` and `xh` requests that don't ask for HTML get a **plain-text portfolio** for `/`, `/work` and `/work/<slug>` (`proxy.ts` → `/api/text`), generated from the content files: block-letter wordmark, positioning, location, availability, summary, selected runs (with a `curl` link to each), how I work, toolbox, contact, and `Try: curl [domain]/work/<slug>`. Run pages: status, title, lead, facts, the system's steps and branches, the trace (with its note), results, the MDX sections, next run.
- **Max 80 columns** (tested on every page). **ANSI 256-colour 202** for the orange accents and bold headings; **`?nocolor`** removes every escape code. Unknown runs: `404` with "Run failed: route not found".
- **`Vary: User-Agent, Accept`** is set on the text responses. **Limitation found:** Next.js 16 overwrites `Vary` on HTML pages (its app-page runtime calls `res.setHeader('Vary', …)` — `node_modules/next/dist/esm/build/templates/app-page-runtime.js`), so neither the proxy nor `next.config` headers can add User-Agent/Accept there. On Vercel this is safe — the proxy runs before the CDN cache on every request, so the two versions are never mixed. If you ever put a generic CDN in front of a self-hosted server, the HTML side would need a small framework patch. **Owner decision (Phase 6 review): the site is hosted on Vercel, so no patch — revisit this if the hosting ever changes.**
- Advertised in the footer ("Try curl [domain]", already there) and in a **console message** for developers (inline, so it costs no JS budget).

Sample (`curl [domain]?nocolor`, first lines):

```

██ █   █  ███  █   █ ████     █   █  ███  █   █ █████ ██
█   █ █  █   █ █   █ █   █    ██  █ █   █ ██ ██ █      █
█    █   █   █ █   █ ████     █ █ █ █████ █ █ █ ████   █
█    █   █   █ █   █ █  █     █  ██ █   █ █   █ █      █
██   █    ███   ███  █   █    █   █ █   █ █   █ █████ ██

AI agents & automation  ·  [CITY]  ·  ● Available for projects

I design, build and run AI agents and automations for teams that are done doing
the same work twice.

── SELECTED RUNS ───────────────────────────────────────────────────────────────

RUN #014  [Support inbox agent]                         ● In production · [2026]
          [One-line outcome with a real number]
          → curl [yourdomain.com]/work/support-inbox-agent

RUN #011  [Invoice extraction pipeline]                 ● In production · [2026]
          [One-line outcome with a real number]
          → curl [yourdomain.com]/work/invoice-extraction-pipeline

RUN #009  [Lead research agent]                         ● In production · [2025]
          [One-line outcome with a real number]
          → curl [yourdomain.com]/work/lead-research-agent

RUN #006  [Weekly ops report]                             ○ Handed over · [2025]
          [One-line outcome with a real number]
          → curl [yourdomain.com]/work/weekly-ops-report

```

## Tests
- `tests/e2e/curl.spec.ts`: curl → `text/plain` with the name, an email address, orange ANSI and `Vary`; `?nocolor` has no escape codes; every page ≤ 80 columns; run pages in text; unknown runs 404; Wget / HTTPie / xh get text; browsers and terminals asking for HTML get the site.
- `tests/e2e/prompt.spec.ts` (the smart path is exercised with a test-build switch, `?smart=1`, against mocked `/api/prompt` answers): no model → no server call; drafted steps replace the template (titles, kinds, summary); slower than 2.5s or an error → templates; chips never call the server; "Build this with me" carries the sentence, the plain-language steps and the JSON; the agent describes the system the visitor built.
- `tests/unit/replays.test.ts`: every demo answer is built from content. `tests/unit/content.test.ts`: the projects index matches the frontmatter, exactly one featured run.
- Hardening: the axe helper waits for animations to settle and excludes only `[data-ghost]` — the design's faint "upcoming step" boxes (decorative, aria-hidden; WCAG 1.4.3's incidental-text exception). They were flagged intermittently under load.

**122 e2e + 42 unit, all passing. Home initial JS 189.3KB.**

## Needs the owner
1. Approve or edit the demo answers above (wording only — the facts come from your content).
2. Confirm which run is `featured` (the agent's "best project").
3. Live mode / smart prompt keys: `AGENT_MODEL` (+ `AGENT_PROVIDER`) and the provider key, Upstash keys — in `.env.local` / Vercel, then rebuild. Both stay off until then.
4. The `Vary` limitation on HTML pages (above): fine on Vercel; tell me if you'll self-host behind another CDN.
