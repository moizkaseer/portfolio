"use client";

import { agentStore, newId } from "./store";
import { createTurn } from "./turn";
import { traceLabel } from "./protocol";
import { pickReplay, type Step } from "./replay-script";
import { replayContent } from "./replay-content";

/**
 * Demo replay (brief §7 fallback): recorded answers played through the same UI, with the same
 * trace and the same UI actions, whenever no model is configured. The answers are built from the
 * content files (replay-script.ts + replay-content.ts); nothing here pretends to be live.
 */
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
  const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  const steps: Step[] = pickReplay(question).steps(replayContent(theme));
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
      await turn.ui(step.tool, step.input, step.key ? queued.get(step.key) : undefined);
      await sleep(200);
    } else {
      await streamText(id, step.text, () => cancelled);
    }
  }
  turn.end();
}
