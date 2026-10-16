/**
 * Hand-off from the "What should run itself?" prompt (C2) — and later the agent's
 * ui.prefill_contact (C1) — to the contact form.
 */
export interface ContactPrefill {
  /** plain-language summary for "What should be automated?" */
  summary: string;
  /** the generated system as JSON (hidden field) */
  system?: { task: string; nodes: { kind: string; title: string }[] };
}

export const PREFILL_EVENT = "contact:prefill";

export function prefillContact(p: ContactPrefill) {
  window.dispatchEvent(new CustomEvent<ContactPrefill>(PREFILL_EVENT, { detail: p }));
}

export function systemSummary(task: string, nodes: { kind: string; title: string }[]) {
  const steps = nodes.map((n, i) => `${i + 1}. ${n.title} (${n.kind.toLowerCase()})`).join("\n");
  return `${task.trim() || "My task"}\n\nThe system you sketched:\n${steps}`;
}

/** The system the visitor last built in "What should run itself?" — for the agent's get_prompt_state. */
export interface PromptState {
  task: string;
  nodes: { kind: string; title: string }[];
  source: "template" | "generic" | "smart";
}
let promptState: PromptState | null = null;
export const getPromptState = () => promptState;
export const setPromptState = (s: PromptState) => (promptState = s);

/**
 * The smart engine (loaded on first use of the prompt input) replaces the generic template's
 * nodes with the ones drafted from the visitor's words. The hero only applies this overlay.
 */
type Overlay = (<T>(p: T) => T) | null;
let overlay: Overlay = null;
const overlayListeners = new Set<() => void>();
export const getPromptOverlay = () => overlay;
export const subscribePromptOverlay = (l: () => void) => (overlayListeners.add(l), () => void overlayListeners.delete(l));
export function setPromptOverlay(o: unknown) {
  overlay = o as Overlay;
  overlayListeners.forEach((l) => l());
}
