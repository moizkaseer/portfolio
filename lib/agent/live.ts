"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import { agentStore, type Message, type ToolRow } from "./store";
import { createTurn } from "./turn";
import { traceLabel } from "./protocol";
import { getPromptState } from "@/lib/prompt-store";

/**
 * The live agent (AI SDK Chat over /api/agent). Loaded only when a model is configured.
 * Server tools stream their calls and results into the trace; ui_* tool calls run in the
 * browser through the same turn runner as the demo replay, and their result goes back to the
 * model. Errors (rate limit, turn limit) show as a notice.
 */
let chat: Chat<UIMessage> | null = null;
let turn: ReturnType<typeof createTurn> | null = null;
const notices = new Map<string, string>();

function meta(part: { state: string; output?: unknown; errorText?: string }) {
  if (part.state === "output-error") return { state: "error" as const, meta: "failed" };
  if (part.state !== "output-available") return { state: "running" as const, meta: "running" };
  const o = part.output as { status?: string } | unknown[];
  if (Array.isArray(o)) return { state: "done" as const, meta: `${o.length} result${o.length === 1 ? "" : "s"}` };
  if (o && typeof o === "object" && "status" in o && o.status && o.status !== "done") return { state: "cancelled" as const, meta: String(o.status) };
  return { state: "done" as const, meta: "done" };
}

function sync() {
  if (!chat) return;
  const streaming = chat.status === "streaming" || chat.status === "submitted";
  const prev = new Map(agentStore.get().messages.map((m) => [m.id, m]));
  const messages: Message[] = chat.messages.map((m, i) => {
    const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    const tools: ToolRow[] = m.parts
      .filter((p) => p.type.startsWith("tool-"))
      .map((p) => {
        const tp = p as unknown as { type: string; toolCallId: string; state: string; input?: unknown; output?: unknown };
        return { id: tp.toolCallId, label: traceLabel(tp.type.slice(5), tp.input), ...meta(tp) };
      });
    return {
      id: m.id,
      role: m.role === "user" ? "user" : "agent",
      text,
      tools,
      streaming: streaming && i === chat!.messages.length - 1 && m.role === "assistant",
      notice: notices.get(m.id) ?? prev.get(m.id)?.notice,
    };
  });
  agentStore.set({ messages, busy: streaming || agentStore.get().acting !== null });
}

function ensureChat() {
  if (chat) return chat;
  chat = new Chat<UIMessage>({
    // every request carries the visitor's last "What should run itself?" system (get_prompt_state)
    transport: new DefaultChatTransport({ api: "/api/agent", body: () => ({ promptState: getPromptState() }) }),
    sendAutomaticallyWhen: (o) => lastAssistantMessageIsCompleteWithToolCalls(o),
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic || !toolCall.toolName.startsWith("ui_")) return;
      const last = chat!.messages[chat!.messages.length - 1];
      turn ??= createTurn(last.id);
      const output = await turn.ui(toolCall.toolName, toolCall.input, toolCall.toolCallId);
      void chat!.addToolOutput({ tool: toolCall.toolName as never, toolCallId: toolCall.toolCallId, output: output as never });
    },
    onFinish() {
      if (chat?.status !== "streaming" && chat?.status !== "submitted") {
        turn?.end();
        turn = null;
      }
    },
    onError(error) {
      const last = chat!.messages[chat!.messages.length - 1];
      const msg = /rate-limit/.test(error.message)
        ? "That's a lot of questions — try again in an hour, or use the contact form."
        : /turn-limit/.test(error.message)
          ? "That's the limit for one session — the contact form reaches a person."
          : "The agent is unavailable right now — the contact form still works.";
      if (last) notices.set(last.id, msg);
      turn?.end();
      turn = null;
      sync();
    },
  });
  chat["~registerMessagesCallback"](sync, 40);
  chat["~registerStatusCallback"](sync);
  return chat;
}

export function sendLive(text: string) {
  turn = null;
  void ensureChat().sendMessage({ text });
}

export function stopLive() {
  void chat?.stop();
}
