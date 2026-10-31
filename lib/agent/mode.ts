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
 * applies the result to the agent store. When the Python backend is asleep (free host), the
 * status route answers { mode: "demo", waking: true } and wakes it; the probe then retries a few
 * times over ~70s and announces "live" through onAgentModeChange once the backend is up, so the
 * page doesn't stay in demo replay for the whole visit.
 * This file loads through components/Boot.tsx (idle, via components/Deferred.tsx), outside the
 * home page's initial JS budget (190KB, owner decision).
 */
let probe: Promise<AgentMode> | undefined;
export const agentMode = () => (probe ??= probeAgentMode());

/** Delays between re-probes while the backend wakes (~70s in total). */
export const WAKE_RETRY_MS = [8000, 10000, 12000, 12000, 14000, 14000];

let waking = false;
/** True while the live backend is (probably) waking up and the demo replay stands in. */
export const agentWaking = () => waking;

const listeners = new Set<(m: AgentMode) => void>();
/** Called when a re-probe flips the mode after the first answer (demo -> live once the backend wakes). */
export function onAgentModeChange(cb: (m: AgentMode) => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

async function fetchStatus(): Promise<{ mode: AgentMode; waking: boolean }> {
  return fetch("/api/agent/status", { cache: "no-store" })
    .then((r) => r.json())
    .then((d: { mode?: string; waking?: unknown }) => ({ mode: d.mode === "live" ? ("live" as const) : ("demo" as const), waking: d.waking === true }))
    .catch(() => ({ mode: "demo" as const, waking: false }));
}

function applyLabels(mode: AgentMode) {
  document.querySelectorAll<HTMLElement>("[data-agent-mode]").forEach((el) => {
    el.textContent = el.dataset[mode === "live" ? "agentModeLive" : "agentModeDemo"] ?? mode;
  });
}

async function probeAgentMode(): Promise<AgentMode> {
  const first = await fetchStatus();
  applyLabels(first.mode);
  if (first.mode === "demo" && first.waking) {
    waking = true;
    void retryUntilLive();
  }
  return first.mode;
}

async function retryUntilLive() {
  for (const ms of WAKE_RETRY_MS) {
    await new Promise((r) => setTimeout(r, ms));
    const next = await fetchStatus();
    if (next.mode === "live") {
      waking = false;
      probe = Promise.resolve("live");
      applyLabels("live");
      listeners.forEach((cb) => cb("live"));
      return;
    }
  }
  waking = false; // gave up: stay in demo for this page load
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
