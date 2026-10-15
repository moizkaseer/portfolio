# Phase 5 review — the agent that drives the site (C1)

Branch `phase-5-agent` (on top of `phase-4-work`). Paused here for the owner's review.

## Phase 4 review fixes
- **Unknown runs are a real 404 on the first request.** `dynamicParams` can't be used with Cache Components (the build fails on it), so `proxy.ts` checks `/work/<slug>` against `lib/content/slugs.generated.json` — regenerated from `content/projects` before every `dev` / `build`, with a unit test that it's in sync — and unknown slugs get the framework's 404 before anything renders. Test: a never-requested slug answers 404; known runs answer 200.
- **The replay sentence lives in the trace file** (`trace.json` → `note`) and reads "This is a sample run showing how the system works." The file's `_todo` says to switch it to "This is a real run with customer details removed." with the real trace. A test checks the page never claims a real run.

## What was built
- **Demo replay (the default)**: with no model configured, the agent plays recorded answers through the same UI, trace and page actions, labelled "Demo replay" in section 06's header and in the chat. Seven recordings: *best project* (scroll → highlight → open RUN #011 with the ghost pointer), *what do you build*, *reliability*, *availability*, *tools* (highlights them in the toolbox), *switch to dark/light mode*, and a price question ("I don't know — ask [YOUR NAME] directly"). Answers only use what's on the site; placeholders stay placeholders. Anything else gets an honest "this is a demo replay" reply.
- **Live mode** (`/api/agent`, Vercel AI SDK v7): model and provider only from environment variables — `AGENT_MODEL` ("provider/model", e.g. `anthropic/claude-sonnet-5.5`), `AGENT_PROVIDER` (`gateway` by default, or `anthropic` / `openai` with their own key). See `.env.example`; nothing is hard-coded and there's no default model. Read-only server tools over `/content`: `search_projects`, `get_case_study`, `get_toolbox`, `get_availability`, `draft_intro_email` (returns text, never sends). System prompt per brief §7. Limits: 12 visitor messages per IP per hour (Upstash when configured), 6 turns per session, 500 characters per message, 500 output tokens, 6 steps. Nothing about visitors or conversations is logged. `get_prompt_state` (C2) comes with the smart prompt in Phase 6, as the brief plans.
- **UI actions (C1)**: `ui.scroll_to`, `ui.highlight_project`, `ui.open_project`, `ui.set_theme`, `ui.highlight_tools`, `ui.prefill_contact` — a strict allow-list (`lib/agent/protocol.ts`) checked in the browser against the real sections, slugs, themes and tool names; at most 3 per turn. There is no way to submit a form, send an email or leave the site (`ui.prefill_contact` only fills the field). Each action shows in the trace (`ui.open_project("…") · done`).
- **Ghost pointer**: a `--signal` arrow with an `agent · <action>` label glides (600ms expo-out) to the target before each action; the visitor's cursor is never touched. **The visitor is in charge**: their first wheel, touch, key press or click cancels the rest of the turn ("control returned to you", remaining rows struck through as cancelled). While the agent acts, a resting cursor doesn't open other run rows. Reduced motion: no glide, actions happen at once with a brief outline.
- **Where the chat lives**: on the home page the conversation takes over section 06's terminal in place (the design's static session stays for no-JS). Everywhere else — and as soon as the agent's actions take the visitor away from section 06 — it shows in a floating panel (desktop) or bottom sheet (phones), which shrinks to a pill with the current action while the agent acts. The agent lives in the root layout, so the conversation and the pointer survive navigation (e.g. into the run report it just opened, with the title morph).
- **Triggers**: section 06's chips and input, a floating "Ask the agent ⌘K" pill (desktop), the "Ask the agent" bar (phones, now on every page), and "Ask the agent" in the command palette.

## Home page budget
**189.8KB** (≤ 190KB, enforced by the test). The only agent code in the initial load is a delegated listener in the existing launcher (~0.6KB); the chat, ghost pointer, action runner and replays load on the first click / focus / ⌘K, and the AI SDK client loads only in live mode. The static pill and bar are HTML.

## Recording
`docs/fidelity/phase-5/agent-opens-project-desktop.webm` (from section 06) and `agent-opens-project-phone.webm` (from the bar; the sheet shrinks to the action pill) — the demo replay scrolling to Selected runs, highlighting RUN #011 with the ghost pointer and opening its run report. 3.2MB / 1.7MB, git-ignored like the other recordings; produced by `node tests/fidelity/record-agent.mjs`.

## Tests
`tests/e2e/agent.spec.ts` (desktop + phone): nothing of the agent loads until asked; `/api/agent` answers demo without a model; the best-project replay scrolls, highlights and opens the run report and the conversation follows; a scroll cancels the rest and the run report is never opened; "switch to dark mode"; the palette opens the chat and Escape closes it; six questions per session; reduced motion (no pointer, actions still happen); axe clean with the chat open. `tests/unit/agent.test.ts`: the allow-list (no form submit, email or external URL; unknown sections/slugs/themes/tools refused; 3 per turn) and the env-only model configuration.

**104 e2e + 36 unit, all passing.** Lighthouse mobile (home): Performance 93, Accessibility / Best Practices / SEO 100; LCP 2.3s, CLS 0.002.

## Decisions taken
- **One action runner for both modes**: the demo replay and the live model drive the page through the same validated actions, so what the replay shows is exactly what the live agent can do.
- **Panel vs section 06**: when the visitor talks in section 06 the answer stays there; the panel appears only when the agent takes them elsewhere or they open it from another page.
- The trigger stops the click from reaching other handlers: the fallback `href="/#agent"` (for no-JS) was otherwise picked up by Lenis' anchor scrolling.
- Without a configured model, section 06's header reads "Demo replay · reads only my case studies" instead of "Live · …", so the site never claims to be live when it isn't.

## Needs the owner
1. To go live: `AGENT_MODEL` (+ `AGENT_PROVIDER` if not using the AI Gateway) and the matching key in `.env.local` / the Vercel project — and the Upstash keys for the shared rate limit. Then rebuild: the mode is decided at build time.
2. Review the recorded answers in `lib/agent/replays.ts` (they speak for you).
3. Everything else still `[TODO]` is in AUDIT.md §6.
