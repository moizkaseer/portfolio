import { generateText, Output } from "ai";
import { agentModel } from "@/lib/server/agent-model";
import { clientIp, createLimiter } from "@/lib/server/rate-limit";
import { SystemSchema } from "@/lib/prompt/schema";

const limit = createLimiter("prompt", 12, 60 * 60); // like the agent (brief §7, C2)
const TIMEOUT_MS = 2500;

/**
 * POST /api/prompt { task } — the smart engine for "What should run itself?" (brief C2): turns
 * the visitor's sentence into 5 nodes ({ kind, title }), validated with zod. Without a model,
 * on any error or after 2.5s it answers { fallback: true } and the page uses the instant
 * templates — silently.
 */
export async function POST(request: Request) {
  const model = agentModel();
  if (!model) return Response.json({ fallback: true }, { status: 503 });

  const body = await request.json().catch(() => null);
  const task = typeof body?.task === "string" ? body.task.trim() : "";
  if (task.length < 3 || task.length > 500) return Response.json({ fallback: true }, { status: 400 });

  const { success } = await limit(clientIp(request.headers));
  if (!success) return Response.json({ fallback: true }, { status: 429 });

  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema: SystemSchema }),
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      maxOutputTokens: 300,
      prompt: `Sketch the automation for this task, as exactly 5 steps in order.

Task (from a website visitor): """${task}"""

Each step has a kind and a short title:
- kind: Trigger (an event starts it) or Schedule (a time starts it) for step 1; then Model (an AI model reads/writes/decides), Code (deterministic logic: matching, maths, checks), Tool (an existing app or API: inbox, CRM, sheet, Slack, accounting…) or Human (a person checks or approves).
- Use a Human step where a mistake would be costly or the input is ambiguous.
- title: 2–5 words, sentence case, no trailing period, concrete to the task (e.g. "Invoice email arrives", "Match to purchase orders").
If the task is not something that can be automated, still return 5 sensible steps for the closest workflow.`,
    });
    return Response.json({ nodes: output.nodes });
  } catch {
    return Response.json({ fallback: true }, { status: 502 });
  }
}
