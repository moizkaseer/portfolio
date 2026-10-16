import type { Graph } from "./schema";

export interface TraceNode {
  id: string;
  label: string;
  /** shorter label for phones (falls back to the id) */
  short: string;
  kind: Graph["nodes"][number]["kind"];
}

/**
 * The mini trace for a project row: the graph's main path from its first source to its
 * last sink. Human steps that are side branches (e.g. "confidence < 0.9 → review") are
 * skipped when another way forward exists; an approval in the main line is kept.
 * Pure and deterministic; computed at build time when the page renders statically.
 */
export function mainPath(graph: Graph): TraceNode[] {
  const out = new Map<string, string[]>();
  const indeg = new Map<string, number>(graph.nodes.map((n) => [n.id, 0]));
  for (const [a, b] of graph.edges) {
    out.set(a, [...(out.get(a) ?? []), b]);
    indeg.set(b, (indeg.get(b) ?? 0) + 1);
  }
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const start = graph.nodes.find((n) => indeg.get(n.id) === 0) ?? graph.nodes[0];

  // longest path through non-Human nodes (graphs are small DAGs)
  const memo = new Map<string, string[]>();
  const longest = (id: string, seen: Set<string>): string[] => {
    if (memo.has(id)) return memo.get(id)!;
    let best: string[] = [];
    const nexts = (out.get(id) ?? []).filter((n) => !seen.has(n));
    const automatic = nexts.filter((n) => byId.get(n)?.kind !== "Human");
    for (const next of automatic.length ? automatic : nexts) {
      const p = longest(next, new Set([...seen, next]));
      if (p.length > best.length) best = p;
    }
    const res = [id, ...best];
    memo.set(id, res);
    return res;
  };
  return longest(start.id, new Set([start.id])).map((id) => {
    const n = byId.get(id)!;
    return { id: n.id, label: n.label, short: n.short ?? n.id.replace(/-/g, " "), kind: n.kind };
  });
}
