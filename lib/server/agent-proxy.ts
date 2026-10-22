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
    return Response.json({ error: "agent-unavailable" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  // Control-plane errors (rate-limit, turn-limit, invalid-request, the demo-mode
  // 503) are plain JSON on the backend too — pass them through as-is.
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
