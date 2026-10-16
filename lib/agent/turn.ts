"use client";

import toolbox from "@/content/toolbox.json";
import { agentStore, newId, type RowState } from "./store";
import { MAX_UI_ACTIONS_PER_TURN, traceLabel, validateUiAction } from "./protocol";
import { hideGhost, runUiAction, watchForVisitor } from "./actions";

const TOOL_NAMES = toolbox.groups.flatMap((g) => g.tools);

export type UiOutput = { status: "done"; result: string } | { status: "cancelled" | "refused" | "failed"; reason: string };

/**
 * One agent turn: appends tool rows to the agent's message and runs UI actions with the limits
 * (max 3, allow-list, real slugs). The first wheel/touch/key/click from the visitor during the
 * turn's actions cancels the rest and shows "control returned to you".
 */
export function createTurn(messageId: string) {
  let uiCount = 0;
  let cancelled = false;
  let watcher: ReturnType<typeof watchForVisitor> | null = null;

  const row = (label: string, state: RowState, meta: string, id = newId()) => {
    agentStore.updateMessage(messageId, (m) => {
      const exists = m.tools.some((t) => t.id === id);
      return { tools: exists ? m.tools.map((t) => (t.id === id ? { ...t, label, state, meta } : t)) : [...m.tools, { id, label, state, meta }] };
    });
    return id;
  };

  const acting = (on: boolean) => document.documentElement.toggleAttribute("data-agent-acting", on);

  const takeOver = () => {
    cancelled = true;
    acting(false);
    agentStore.set({ acting: null });
    agentStore.updateMessage(messageId, (m) => ({
      notice: "control returned to you",
      tools: m.tools.map((t) => (t.state === "running" || t.state === "queued" ? { ...t, state: "cancelled", meta: "cancelled" } : t)),
    }));
  };

  return {
    row,
    get cancelled() {
      return cancelled;
    },
    /** Queue a UI action row ahead of time (shown as "queued", as in the design's trace). */
    queue(tool: string, input: unknown) {
      return row(traceLabel(tool, input), "queued", "queued");
    },
    async ui(tool: string, input: unknown, rowId?: string): Promise<UiOutput> {
      const label = traceLabel(tool, input);
      if (cancelled) {
        row(label, "cancelled", "cancelled", rowId);
        return { status: "cancelled", reason: "the visitor took control of the page" };
      }
      if (uiCount >= MAX_UI_ACTIONS_PER_TURN) {
        row(label, "error", "limit: 3 per turn", rowId);
        return { status: "refused", reason: `at most ${MAX_UI_ACTIONS_PER_TURN} UI actions per turn` };
      }
      const action = validateUiAction(tool, input, TOOL_NAMES);
      if (typeof action === "string") {
        row(label, "error", "refused", rowId);
        return { status: "refused", reason: action };
      }
      uiCount += 1;
      watcher ??= watchForVisitor(takeOver);
      acting(true);
      const id = row(label, "running", "running", rowId);
      agentStore.set({ acting: label });
      try {
        const result = await runUiAction(action, watcher.signal);
        if (cancelled) return { status: "cancelled", reason: "the visitor took control of the page" };
        row(label, "done", "done", id);
        return { status: "done", result };
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) {
          row(label, "cancelled", "cancelled", id);
          return { status: "cancelled", reason: "the visitor took control of the page" };
        }
        row(label, "error", "failed", id);
        return { status: "failed", reason: e instanceof Error ? e.message : "failed" };
      } finally {
        agentStore.set({ acting: null });
      }
    },
    end() {
      acting(false);
      watcher?.release();
      window.setTimeout(hideGhost, 1200);
    },
  };
}
