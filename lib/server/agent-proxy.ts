import "server-only";

/**
 * Thin streaming proxy to the Python agent backend (brief §6). Forwards the
 * request body, the visitor's IP and the shared secret unchanged, and streams
 * the backend's response straight through — the backend emits the exact same
 * ai-SDK UI message stream format app/api/agent/route.ts does, so live.ts
 * needs no changes either way.
 */
const DEFAULT_TIMEOUT_MS = 30_000;
const STREAM_HEADER_ALLOWLIST = ["content-type", "x-vercel-ai-ui-message-stream", "cache-control", "connection", "x-accel-buffering"];

export async function proxyAgentRequest(request: Request, backendUrl: string, clientIp: string): Promise<Response> {
  const body = await request.text();
  const timeoutMs = Number(process.env.AGENT_BACKEND_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const secret = process.env.AGENT_SHARED_SECRET;
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": clientIp };
  if (secret) headers["x-agent-secret"] = secret;

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${backendUrl.replace(/\/+$/, "")}/v1/chat`, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
  } catch {
    // unreachable / timed out (e.g. a free host waking up): play the demo instead of an error
    return demoFallback("unreachable");
  } finally {
    clearTimeout(timeout);
  }

  // Backend is up but can't serve a live answer (no key, Gemini free quota used up, model
  // overloaded, crash): answer the same 503 { demo: true } the route uses when nothing is
  // configured, so the browser falls back to the scripted demo replay (lib/agent/live.ts).
  if (backendResponse.status >= 500) {
    const data = (await backendResponse.json().catch(() => null)) as { reason?: unknown } | null;
    return demoFallback(typeof data?.reason === "string" ? data.reason : "backend-error");
  }

  // Control-plane errors (rate-limit, turn-limit, invalid-request) are plain JSON on
  // the backend too — pass them through as-is.
  if (!backendResponse.ok) {
    const text = await backendResponse.text();
    return new Response(text, {
      status: backendResponse.status,
      headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
    });
  }

  const outHeaders = new Headers();
  for (const key of STREAM_HEADER_ALLOWLIST) {
    const value = backendResponse.headers.get(key);
    if (value) outHeaders.set(key, value);
  }
  return new Response(backendResponse.body, { status: backendResponse.status, headers: outHeaders });
}

function demoFallback(reason: string): Response {
  return Response.json({ demo: true, reason }, { status: 503 });
}

/** GET {backend}/healthz with a short timeout — true only if it's up and has a model key. */
export async function backendLive(backendUrl: string, timeoutMs = 2500): Promise<boolean> {
  try {
    const res = await fetch(`${backendUrl.replace(/\/+$/, "")}/healthz`, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { modelConfigured?: unknown };
    return data.modelConfigured === true;
  } catch {
    return false;
  }
}

/**
 * Fire-and-forget wake-up for a sleeping free host: a plain GET /healthz with a long timeout (a
 * Render free instance takes ~1 min to cold-start). Never throws; the result doesn't matter.
 */
export async function wakeBackend(backendUrl: string, timeoutMs = 55_000): Promise<void> {
  try {
    await fetch(`${backendUrl.replace(/\/+$/, "")}/healthz`, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    // still asleep or unreachable — the next status probe will nudge it again
  }
}
