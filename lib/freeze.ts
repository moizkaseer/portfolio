/**
 * `?freeze=<state>` renders deterministic states for the fidelity check (DESIGN_SPEC §9).
 * Dev-only: enabled in `next dev`, or in a build made with NEXT_PUBLIC_ALLOW_FREEZE=1 (test builds).
 */
export const FREEZE_ALLOWED =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ALLOW_FREEZE === "1";

export function readFreeze(): string | null {
  if (!FREEZE_ALLOWED || typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("freeze");
}
