/** A run's status. "Live" ones (running or being built) get the pulsing LED. */
export const RUN_STATUSES = ["in-production", "building", "completed", "handed-over"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const isLive = (s: RunStatus) => s === "in-production" || s === "building";

/**
 * "In production" — or, with `since`, "In production since 2025" (live statuses only). The label
 * is the status id in sentence case, which keeps the home page's client bundle a few bytes lighter.
 */
export function statusLabel(s: RunStatus, since?: string) {
  const label = s[0].toUpperCase() + s.slice(1).replace("-", " ");
  return since && isLive(s) ? `${label} since ${since}` : label;
}
