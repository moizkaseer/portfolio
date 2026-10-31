import { convertToModelMessages, createUIMessageStreamResponse, stepCountIs, streamText, toUIMessageStream, type UIMessage } from "ai";
import { agentModel } from "@/lib/server/agent-model";
import { proxyAgentRequest } from "@/lib/server/agent-proxy";
import { PromptStateSchema, serverTools, systemPrompt, uiTools } from "@/lib/server/agent-tools";
import { clientIp, createLimiter } from "@/lib/server/rate-limit";
import { MAX_INPUT_CHARS, MAX_TURNS } from "@/lib/agent/protocol";

// The Python backend bounds a whole turn at ~45s (AGENT_TURN_BUDGET_MS); leave headroom for the stream.
export const maxDuration = 60;

const limit = createLimiter("agent", 12, 60 * 60); // 12 visitor messages per IP per hour (brief §7)

const textOf = (m: UIMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

/**
 * POST /api/agent — the live agent (brief §7, C1). Streams text and tool calls; server tools are
 * read-only over /content, ui_* tools run in the visitor's browser. Without a configured model
 * it answers 503 { demo: true } and the client plays the scripted demo replay. Nothing about the
 * visitor or the conversation is logged.
 *
 * When AGENT_BACKEND_URL is set, this route becomes a thin streaming proxy to the Python agent
 * service (agent/) instead — see lib/server/agent-proxy.ts. Without it, the behaviour below is
 * unchanged.
 */
export async function POST(request: Request) {
  const backendUrl = process.env.AGENT_BACKEND_URL?.trim();
  if (backendUrl) return proxyAgentRequest(request, backendUrl, clientIp(request.headers));

  const model = agentModel();
  if (!model) return Response.json({ demo: true }, { status: 503 });

  const body = await request.json().catch(() => null);
  const messages: UIMessage[] | undefined = body?.messages;
  if (!Array.isArray(messages) || !messages.length) return Response.json({ error: "Invalid request." }, { status: 400 });

  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length > MAX_TURNS) return Response.json({ error: "turn-limit" }, { status: 429 });
  if (userMessages.some((m) => textOf(m).length > MAX_INPUT_CHARS)) return Response.json({ error: "too-long" }, { status: 413 });

  // only a new visitor message counts against the rate limit (not the follow-ups after ui tools)
  if (messages[messages.length - 1].role === "user") {
    const { success } = await limit(clientIp(request.headers));
    if (!success) return Response.json({ error: "rate-limit" }, { status: 429 });
  }

  const result = streamText({
    model,
    system: systemPrompt(),
    messages: await convertToModelMessages(messages),
    tools: { ...serverTools(PromptStateSchema.safeParse(body?.promptState ?? null).data ?? null), ...uiTools() },
    stopWhen: stepCountIs(6),
    maxOutputTokens: 500,
  });

  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}
