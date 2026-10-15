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
