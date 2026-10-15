"use client";

import { setPromptOverlay } from "@/lib/prompt-store";
import type { deriveVisuals } from "@/lib/motion/hero-motion";

type PromptVisuals = ReturnType<typeof deriveVisuals>["prompt"];
type Node = { kind: string; title: string };

const KINDS = new Set(["Trigger", "Schedule", "Model", "Code", "Tool", "Human"]);
const TIMEOUT_MS = 2500;

/**
 * The smart engine's browser side (brief C2), loaded on first use of the prompt input. Asks
 * /api/prompt for 5 nodes; anything other than a valid answer within 2.5s returns null and the
 * caller falls back to the instant templates, silently.
 */
export async function smartNodes(task: string): Promise<Node[] | null> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { nodes?: Node[] };
    const nodes = data.nodes;
    const valid =
      Array.isArray(nodes) &&
      nodes.length === 5 &&
      nodes.every((n) => KINDS.has(n.kind) && typeof n.title === "string" && n.title.trim().length >= 2 && n.title.length <= 40);
    return valid ? nodes.map((n) => ({ kind: n.kind, title: n.title.trim() })) : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(t);
  }
}

/** Shows the smart nodes in place of the generic template's (kinds, titles, marks, summary). */
export function showSmart(nodes: Node[] | null) {
  if (!nodes) return setPromptOverlay(null);
  const models = nodes.filter((n) => n.kind === "Model").length;
  const humans = nodes.filter((n) => n.kind === "Human").length;
  setPromptOverlay((p: PromptVisuals) => ({
    ...p,
    nodes: p.nodes.map((n, i) => ({
      ...n,
      kind: nodes[i].kind as typeof n.kind,
      title: nodes[i].title,
      dashed: nodes[i].kind === "Human" && !n.markActive,
    })),
    summary: `5 steps · ${models} ${models === 1 ? "model" : "models"} · ${humans} ${humans === 1 ? "human check" : "human checks"} · drafted from your words`,
    summaryMobile: `5 steps · ${humans} ${humans === 1 ? "human check" : "human checks"}`,
  }));
}
