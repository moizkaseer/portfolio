/**
 * The agent's demo replay answers, as pure functions of the site's content (owner decision,
 * Phase 5 review): availability, tools, projects, results and location are read from the
 * content files — never written into the answer — so placeholders show until the owner fills
 * them in. docs/PHASE6_REVIEW.md lists every answer's full text.
 */
export interface ReplayContent {
  name: string;
  city: string;
  timezone: string | null;
  summary: string;
  availability: string;
  projects: { slug: string; runId: string; title: string; featured: boolean }[];
  toolbox: { category: string; tools: string[] }[];
  /** owner-approved process copy, by step id */
  process: Record<string, string>;
  /** the system the visitor last built in "What should run itself?", if any */
  prompt: { task: string; nodes: { kind: string; title: string }[] } | null;
  theme: "light" | "dark";
}

export type Step =
  | { kind: "tool"; label: string; meta: string; ms: number }
  | { kind: "queue"; tool: string; input: Record<string, unknown>; key: string }
  | { kind: "ui"; tool: string; input: Record<string, unknown>; key?: string }
  | { kind: "text"; text: string };

export interface Replay {
  id: string;
  /** what the visitor might say */
  match: RegExp;
  steps: (c: ReplayContent) => Step[];
}

const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const REPLAYS: Replay[] = [
  {
    id: "best-project",
    match: /best|show me|impress|favou?rite|top project|strongest/i,
    steps: (c) => {
      const f = c.projects.find((p) => p.featured) ?? c.projects[0];
      return [
        { kind: "tool", label: 'search_projects(sort: "impact")', meta: `142ms · ${plural(c.projects.length, "result", "results")}`, ms: 520 },
        { kind: "ui", tool: "ui_scroll_to", input: { section: "work" } },
        { kind: "ui", tool: "ui_highlight_project", input: { slug: f.slug } },
        { kind: "queue", tool: "ui_open_project", input: { slug: f.slug }, key: "open" },
        { kind: "text", text: `This is RUN #${f.runId}, ${f.title}. I have highlighted it on the page and I am opening the full run report next.` },
        { kind: "ui", tool: "ui_open_project", input: { slug: f.slug }, key: "open" },
      ];
    },
  },
  {
    id: "your-system",
    match: /build this|could you (really )?build|can you build|my system|the system i|what i (built|described|typed)|this system/i,
    steps: (c) => {
      if (!c.prompt) return [{ kind: "tool", label: "get_prompt_state()", meta: "nothing built yet", ms: 200 }, { kind: "ui", tool: "ui_scroll_to", input: { section: "your-turn" } }, { kind: "text", text: `Describe a task in "What should run itself?" first — then I can talk about the system it sketches.` }];
      const models = c.prompt.nodes.filter((n) => n.kind === "Model").length;
      const humans = c.prompt.nodes.filter((n) => n.kind === "Human").length;
      return [
        { kind: "tool", label: "get_prompt_state()", meta: plural(c.prompt.nodes.length, "step", "steps"), ms: 220 },
        { kind: "ui", tool: "ui_prefill_contact", input: { summary: c.prompt.task } },
        {
          kind: "text",
          text: `You described: "${c.prompt.task}". The sketch has ${plural(c.prompt.nodes.length, "step", "steps")} — ${c.prompt.nodes.map((n) => n.title).join(" → ")} — with ${plural(models, "model step", "model steps")} and ${plural(humans, "human check", "human checks")}. Whether ${c.name} would build it this way is a question for ${c.name}: I've put it in the contact form so you can send it.`,
        },
      ];
    },
  },
  {
    id: "theme",
    match: /dark|light|night|day shift|theme/i,
    steps: (c) => {
      const to = c.theme === "light" ? "dark" : "light";
      return [{ kind: "ui", tool: "ui_set_theme", input: { theme: to } }, { kind: "text", text: `Done — switched the site to ${to === "dark" ? "night" : "day"} shift.` }];
    },
  },
  {
    id: "tools",
    match: /tool|stack|tech|use\b|integrat/i,
    steps: (c) => [
      { kind: "tool", label: "get_toolbox()", meta: `38ms · ${plural(c.toolbox.length, "group", "groups")}`, ms: 260 },
      { kind: "ui", tool: "ui_highlight_tools", input: { names: c.toolbox.map((g) => g.tools[0]).filter(Boolean).slice(0, 2) } },
      { kind: "text", text: `${c.toolbox.map((g) => `${g.category}: ${list(g.tools)}`).join(". ")}. Hover a tool to see which runs used it.` },
    ],
  },
  {
    id: "reliability",
    match: /reliab|trust|safe|guardrail|fail|wrong|error|hallucin/i,
    steps: (c) => [
      { kind: "tool", label: "get_case_study()", meta: "121ms", ms: 460 },
      { kind: "ui", tool: "ui_scroll_to", input: { section: "process" } },
      { kind: "text", text: [c.process.plan, c.process.verify].filter(Boolean).join(" ") },
    ],
  },
  {
    id: "location",
    match: /where|based|locat|city|country|time ?zone/i,
    steps: (c) => [
      { kind: "tool", label: "get_availability()", meta: "64ms", ms: 300 },
      { kind: "text", text: `${c.name} is based in ${c.city}${c.timezone ? ` (${c.timezone} time)` : ""}.` },
    ],
  },
  {
    id: "availability",
    match: /availab|hire|book|start|work with|contact|email|reach/i,
    steps: (c) => [
      { kind: "tool", label: "get_availability()", meta: "64ms", ms: 300 },
      { kind: "ui", tool: "ui_scroll_to", input: { section: "contact" } },
      { kind: "text", text: `${c.availability}. Describe the task in the form here and it reaches ${c.name} directly. I won't send anything for you.` },
    ],
  },
  {
    id: "what-you-build",
    match: /build|what do you|services|offer|do you do/i,
    steps: (c) => [
      { kind: "tool", label: "search_projects()", meta: `98ms · ${plural(c.projects.length, "result", "results")}`, ms: 420 },
      { kind: "ui", tool: "ui_scroll_to", input: { section: "work" } },
      { kind: "text", text: `${c.summary} The runs on this site: ${list(c.projects.map((p) => p.title))}.` },
    ],
  },
];

export const PRICE: Replay = {
  id: "price",
  match: /price|cost|rate|budget|how much|€|\$/i,
  steps: (c) => [{ kind: "text", text: `I don't know — ask ${c.name} directly through the contact form.` }],
};

export const FALLBACK: Replay = {
  id: "fallback",
  match: /$^/,
  steps: () => [
    {
      kind: "text",
      text: "This is a demo replay with a few recorded answers — try one of the suggestions, or ask about the best project, reliability, tools, availability or the system you just built. The live agent can answer anything about the work once it's switched on.",
    },
  ],
};

/** Picks the recorded answer for a visitor's message (price first: never guess a number). */
export function pickReplay(question: string): Replay {
  if (PRICE.match.test(question)) return PRICE;
  return REPLAYS.find((r) => r.match.test(question)) ?? FALLBACK;
}
