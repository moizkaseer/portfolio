export type AgentMode = "demo" | "live";

/**
 * Confirms the server's actual agent mode at runtime. The model is configured only through env
 * vars (lib/server/agent-model.ts), which can change without a redeploy, so no prerendered page
 * can be trusted for long: the render's mode is only a first guess, a successful probe of
 * /api/agent/status corrects it either way, and a failed probe always falls back to "demo".
 * Server-rendered labels ([data-agent-mode], e.g. the phone AskBar and section 06's meta) are
 * kept in step too; an element may carry data-agent-mode-live / -demo for its own wording.
 *
 * Probed once per page load (cached): boot() starts it once the page is idle, and AgentRoot
 * applies the result to the agent store. This file loads through components/Boot.tsx (idle, via
 * components/Deferred.tsx), outside the home page's initial JS budget (190KB, owner decision).
 */
let probe: Promise<AgentMode> | undefined;
export const agentMode = () => (probe ??= probeAgentMode());

async function probeAgentMode(): Promise<AgentMode> {
  const mode: AgentMode = await fetch("/api/agent/status", { cache: "no-store" })
    .then((r) => r.json())
    .then((d: { mode?: string }) => (d.mode === "live" ? "live" : "demo"))
    .catch(() => "demo");
  document.querySelectorAll<HTMLElement>("[data-agent-mode]").forEach((el) => {
    el.textContent = el.dataset[mode === "live" ? "agentModeLive" : "agentModeDemo"] ?? mode;
  });
  return mode;
}

/**
 * Vercel Web Analytics + Speed Insights: both cookieless (no consent banner). Injected a few
 * seconds after load; the scripts follow client-side navigations themselves. They only collect
 * data once enabled in the Vercel project dashboard.
 */
export function startInsights() {
  setTimeout(() => {
    void import("@vercel/analytics").then((m) => m.inject({ framework: "next" }));
    void import("@vercel/speed-insights").then((m) => m.injectSpeedInsights({ framework: "next" }));
  }, 3000);
}

/** Called once per page load by components/Boot.tsx. */
export function boot() {
  void agentMode();
  startInsights();
}
