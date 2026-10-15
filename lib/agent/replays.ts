"use client";

import { agentStore, newId } from "./store";
import { createTurn } from "./turn";
import { traceLabel } from "./protocol";

/**
 * Demo replay (brief §7 fallback): recorded conversations played through the same UI, with the
 * same trace and the same UI actions, whenever no model is configured. Every answer only uses
 * what is on the site (placeholders stay placeholders); nothing here pretends to be live.
 */
type Step =
  | { kind: "tool"; label: string; meta: string; ms: number }
  | { kind: "queue"; tool: string; input: Record<string, unknown>; key: string }
  | { kind: "ui"; tool: string; input: Record<string, unknown>; key?: string }
  | { kind: "text"; text: string };

interface Replay {
  match: RegExp;
  steps: Step[];
}

const INVOICE = "invoice-extraction-pipeline";

export const REPLAYS: Replay[] = [
  {
    // the C1 showcase: scroll, highlight, open — with the ghost pointer
    match: /best|show me|impress|favou?rite|top project|strongest/i,
    steps: [
      { kind: "tool", label: 'search_projects(sort: "impact")', meta: "142ms · 4 results", ms: 520 },
      { kind: "ui", tool: "ui_scroll_to", input: { section: "work" } },
      { kind: "ui", tool: "ui_highlight_project", input: { slug: INVOICE } },
      { kind: "queue", tool: "ui_open_project", input: { slug: INVOICE }, key: "open" },
      { kind: "text", text: "This is RUN #011, [Invoice extraction pipeline]. I have highlighted it on the page and I am opening the full run report next." },
      { kind: "ui", tool: "ui_open_project", input: { slug: INVOICE }, key: "open" },
    ],
  },
  {
    match: /dark|light|night|day shift|theme/i,
    steps: [{ kind: "ui", tool: "ui_set_theme", input: { theme: "__toggle" } }, { kind: "text", text: "Done — switched the site's shift for you." }],
  },
  {
    match: /tool|stack|tech|use\b|integrat/i,
    steps: [
      { kind: "tool", label: "get_toolbox()", meta: "38ms · 4 groups", ms: 260 },
      { kind: "ui", tool: "ui_highlight_tools", input: { names: ["[Orchestrator]", "[Model]"] } },
      { kind: "text", text: "Here's the toolbox. The real tool names are still placeholders — [YOUR NAME] is filling them in. Hover a tool to see which runs used it." },
    ],
  },
  {
    match: /reliab|trust|safe|guardrail|fail|wrong|error|hallucin/i,
    steps: [
      { kind: "tool", label: `get_case_study("${INVOICE}")`, meta: "121ms · 5 steps", ms: 460 },
      { kind: "ui", tool: "ui_scroll_to", input: { section: "process" } },
      {
        kind: "text",
        text: "Limits come first, so an agent never wanders. Every result is checked by code or a second model, and when it is unsure it stops and asks a person instead of guessing. Every run is logged so it can be replayed later.",
      },
    ],
  },
  {
    match: /availab|hire|book|start|work with|contact|email|reach/i,
    steps: [
      { kind: "tool", label: "get_availability()", meta: "64ms", ms: 300 },
      { kind: "ui", tool: "ui_scroll_to", input: { section: "contact" } },
      { kind: "text", text: "Yes — available for projects. Describe the task in the form here and [YOUR NAME] replies by email. I won't send anything for you." },
    ],
  },
  {
    match: /build|what do you|services|offer|do you do/i,
    steps: [
      { kind: "tool", label: "search_projects()", meta: "98ms · 4 results", ms: 420 },
      { kind: "ui", tool: "ui_scroll_to", input: { section: "work" } },
      {
        kind: "text",
        text: "AI agents and automations that run in production, for teams that are done doing the same work twice. The runs on this site so far: [Support inbox agent], [Invoice extraction pipeline], [Lead research agent] and [Weekly ops report].",
      },
    ],
  },
];

const PRICE = /price|cost|rate|budget|how much|€|\$/i;

const FALLBACK: Step[] = [
  {
    kind: "text",
    text: "This is a demo replay with a few recorded answers — try one of the suggestions, or ask about the best project, reliability, tools or availability. The live agent can answer anything about the work once it's switched on.",
  },
];

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

let cancelled = false;
/** "Stop": the replay ends after the current step (UI actions are cancelled by the click itself). */
export const cancelReplays = () => (cancelled = true);

async function streamText(messageId: string, text: string, isCancelled: () => boolean) {
  agentStore.updateMessage(messageId, { streaming: true });
  for (let i = 0; i <= text.length; i += 3) {
    if (isCancelled()) break;
    agentStore.updateMessage(messageId, { text: text.slice(0, i) });
    await sleep(18);
  }
  agentStore.updateMessage(messageId, { text, streaming: false });
}

/** Plays the recorded answer that matches the visitor's message. */
export async function runReplay(question: string) {
  const steps = PRICE.test(question)
    ? [{ kind: "text", text: "I don't know — prices depend on the work. Ask [YOUR NAME] directly through the contact form." } as Step]
    : (REPLAYS.find((r) => r.match.test(question))?.steps ?? FALLBACK);
  const id = newId();
  agentStore.set((s) => ({ messages: [...s.messages, { id, role: "agent", text: "", tools: [] }] }));
  const turn = createTurn(id);
  const queued = new Map<string, string>();
  cancelled = false;
  await sleep(380);
  for (const step of steps) {
    if (cancelled || turn.cancelled) {
      if (step.kind === "ui" && step.key && queued.has(step.key)) turn.row(traceLabel(step.tool, step.input), "cancelled", "cancelled", queued.get(step.key));
      continue;
    }
    if (step.kind === "tool") {
      const rowId = turn.row(step.label, "running", "running");
      await sleep(step.ms);
      turn.row(step.label, "done", step.meta, rowId);
    } else if (step.kind === "queue") {
      queued.set(step.key, turn.queue(step.tool, step.input));
    } else if (step.kind === "ui") {
      const input = step.input.theme === "__toggle" ? { theme: document.documentElement.dataset.theme === "light" ? "dark" : "light" } : step.input;
      await turn.ui(step.tool, input, step.key ? queued.get(step.key) : undefined);
      await sleep(200);
    } else {
      await streamText(id, step.text, () => cancelled);
    }
  }
  turn.end();
}
