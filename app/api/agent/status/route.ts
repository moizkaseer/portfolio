import { connection } from "next/server";
import { agentBackendUrl, agentConfigured } from "@/lib/server/agent-model";
import { backendLive } from "@/lib/server/agent-proxy";

/**
 * GET /api/agent/status — whether a model is currently configured, read fresh on every request
 * so the client can confirm live vs demo without trusting a prerendered page. Reading env vars
 * isn't itself a Request-time API Next.js recognises under cacheComponents, so without
 * `connection()` this handler would prerender once at build time and go stale — exactly the bug
 * this endpoint exists to avoid. No secrets: just the mode.
 */
export async function GET() {
  await connection();
  const backend = agentBackendUrl();
  // With the Python backend, "live" means it answers /healthz and has a model key — a sleeping or
  // keyless backend reports "demo" so visitors get the scripted replay instead of an error.
  const live = backend ? await backendLive(backend) : agentConfigured();
  return Response.json({ mode: live ? "live" : "demo" }, { headers: { "Cache-Control": "no-store" } });
}
