"use client";

import { MAX_INPUT_CHARS, MAX_TURNS } from "./protocol";

/** The agent conversation — module state, so it survives page navigation (C1). */
export type RowState = "running" | "done" | "queued" | "cancelled" | "error";
export interface ToolRow {
  id: string;
  label: string;
  meta: string;
  state: RowState;
}
export interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  tools: ToolRow[];
  streaming?: boolean;
  /** a system line under the message, e.g. "control returned to you" */
  notice?: string;
}
export interface AgentState {
  mode: "demo" | "live";
  messages: Message[];
  busy: boolean;
  /** the UI action in progress, e.g. 'ui.scroll_to("work")' (phones show it in the collapsed sheet) */
  acting: string | null;
  panelOpen: boolean;
  session: string;
}

type Listener = () => void;
let state: AgentState = {
  mode: "demo",
  messages: [],
  busy: false,
  acting: null,
  panelOpen: false,
  session: Math.random().toString(16).slice(2, 6),
};
const listeners = new Set<Listener>();
let uid = 0;
export const newId = () => `m${++uid}`;

export const agentStore = {
  get: () => state,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  set(patch: Partial<AgentState> | ((s: AgentState) => Partial<AgentState>)) {
    state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
    listeners.forEach((l) => l());
  },
  updateMessage(id: string, patch: Partial<Message> | ((m: Message) => Partial<Message>)) {
    agentStore.set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) } : m)) }));
  },
  turns: () => state.messages.filter((m) => m.role === "user").length,
};

/** Checks a visitor message before it is sent. Returns an error to show, or null. */
export function checkInput(text: string): string | null {
  if (!text.trim()) return "";
  if (text.length > MAX_INPUT_CHARS) return `Keep it under ${MAX_INPUT_CHARS} characters.`;
  if (agentStore.turns() >= MAX_TURNS) return "That's the limit for one session — the contact form reaches a person.";
  return null;
}
