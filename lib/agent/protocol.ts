/**
 * The agent's UI tools (C1) — a strict allow-list shared by the server (tool definitions) and
 * the browser (validation + execution). Nothing outside this list can happen: the agent can
 * never submit a form, send an email, or leave the domain.
 */
import slugs from "@/lib/content/slugs.generated.json";

export const SECTIONS = ["your-turn", "work", "process", "agent", "toolbox", "contact"] as const;
export type Section = (typeof SECTIONS)[number];

export const UI_TOOLS = {
  ui_scroll_to: "ui.scroll_to",
  ui_highlight_project: "ui.highlight_project",
  ui_open_project: "ui.open_project",
  ui_set_theme: "ui.set_theme",
  ui_highlight_tools: "ui.highlight_tools",
  ui_prefill_contact: "ui.prefill_contact",
} as const;
export type UiToolName = keyof typeof UI_TOOLS;

export type UiAction =
  | { tool: "ui_scroll_to"; input: { section: Section } }
  | { tool: "ui_highlight_project"; input: { slug: string } }
  | { tool: "ui_open_project"; input: { slug: string } }
  | { tool: "ui_set_theme"; input: { theme: "light" | "dark" } }
  | { tool: "ui_highlight_tools"; input: { names: string[] } }
  | { tool: "ui_prefill_contact"; input: { summary: string } };

/** Max UI actions per agent turn (brief C1). */
export const MAX_UI_ACTIONS_PER_TURN = 3;
/** Session limits (brief §7). */
export const MAX_TURNS = 6;
export const MAX_INPUT_CHARS = 500;

const KNOWN_SLUGS = new Set<string>(slugs);

/** Validates a UI tool call against the allow-list and the real slugs/sections. */
export function validateUiAction(tool: string, input: unknown, toolNames: string[]): UiAction | string {
  if (!(tool in UI_TOOLS)) return `unknown UI tool "${tool}"`;
  const i = (input ?? {}) as Record<string, unknown>;
  switch (tool as UiToolName) {
    case "ui_scroll_to":
      return SECTIONS.includes(i.section as Section) ? { tool: "ui_scroll_to", input: { section: i.section as Section } } : `unknown section "${String(i.section)}"`;
    case "ui_highlight_project":
    case "ui_open_project":
      return KNOWN_SLUGS.has(String(i.slug)) ? ({ tool, input: { slug: String(i.slug) } } as UiAction) : `unknown project "${String(i.slug)}"`;
    case "ui_set_theme":
      return i.theme === "light" || i.theme === "dark" ? { tool: "ui_set_theme", input: { theme: i.theme } } : `theme must be "light" or "dark"`;
    case "ui_highlight_tools": {
      const names = Array.isArray(i.names) ? i.names.map(String).filter((n) => toolNames.includes(n)) : [];
      return names.length ? { tool: "ui_highlight_tools", input: { names: names.slice(0, 8) } } : "none of those tools are in the toolbox";
    }
    case "ui_prefill_contact":
      return typeof i.summary === "string" && i.summary.trim() ? { tool: "ui_prefill_contact", input: { summary: i.summary.slice(0, 2000) } } : "summary is required";
  }
}

/** How a tool call reads in the trace: ui.open_project("invoice-extraction-pipeline"). */
export function traceLabel(tool: string, input: unknown): string {
  const name = UI_TOOLS[tool as UiToolName] ?? tool;
  const args = Object.entries((input ?? {}) as Record<string, unknown>).map(([k, v]) => {
    const val = Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(", ")}]` : JSON.stringify(v);
    return UI_TOOLS[tool as UiToolName] && Object.keys(input as object).length === 1 ? val : `${k}: ${val}`;
  });
  return `${name}(${args.join(", ")})`;
}
