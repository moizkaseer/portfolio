import { connection } from "next/server";
import { agentConfigured } from "@/lib/server/agent-model";

/**
 * GET /api/agent/status — whether a model is currently configured, read fresh on every request
 * so the client can confirm live vs demo without trusting a prerendered page. Reading env vars
 * isn't itself a Request-time API Next.js recognises under cacheComponents, so without
 * `connection()` this handler would prerender once at build time and go stale — exactly the bug
 * this endpoint exists to avoid. No secrets: just the mode.
 */
export async function GET() {
  await connection();
  return Response.json({ mode: agentConfigured() ? "live" : "demo" }, { headers: { "Cache-Control": "no-store" } });
}
