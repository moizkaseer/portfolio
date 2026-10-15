"use client";

import { agentStore, checkInput, newId } from "./store";
import { cancelReplays, runReplay } from "./replays";

/** Ask the agent — demo replay or live, the same UI either way. */
export async function ask(text: string) {
  const s = agentStore.get();
  if (s.busy) return;
  const problem = checkInput(text);
  if (problem === "") return;
  if (problem) {
    agentStore.set((st) => ({ messages: [...st.messages, { id: newId(), role: "agent", text: "", tools: [], notice: problem }] }));
    return;
  }
  agentStore.set({ busy: true });
  if (s.mode === "live") {
    const { sendLive } = await import("./live");
    sendLive(text.trim());
    return;
  }
  agentStore.set((st) => ({ messages: [...st.messages, { id: newId(), role: "user", text: text.trim(), tools: [] }] }));
  try {
    await runReplay(text);
  } finally {
    agentStore.set({ busy: false, acting: null });
  }
}

export async function stop() {
  cancelReplays();
  if (agentStore.get().mode === "live") (await import("./live")).stopLive();
}
