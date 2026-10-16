import type { Graph } from "./schema";
import { mainPath } from "./layout";

export type Kind = Graph["nodes"][number]["kind"];

export interface DiagramNode {
  id: string;
  label: string;
  kind: Kind;
  detail?: string;
  /** 01, 02 … in graph.json order (as in the design) */
  num: number;
  /** grid placement: main path on row 1 (columns 1, 3, 5 …), side branches on row 3 */
  col: number;
  row: 1 | 3;
}

export interface DiagramLayout {
  columns: number;
  nodes: DiagramNode[];
  /** horizontal connectors between consecutive main-path nodes (column between them) */
  links: { col: number; from: string; to: string }[];
  /** a side branch: dashed drop from the main node into the side node, labelled */
  branches: { col: number; from: string; to: string; label?: string }[];
  /** side node back into a later main node: along row 3, then up that node's column */
  returns: { fromCol: number; toCol: number; from: string; to: string }[];
  edgeCount: number;
  /** one sentence describing the workflow, for the diagram's accessible name */
  description: string;
}

/**
 * The run report's architecture diagram (RunReport.html), laid out at build time from a
 * project's graph.json: the main path left to right; nodes off the main path (e.g. a human
 * review on low confidence) under the node they branch from, joining back where they lead.
 */
export function diagramLayout(graph: Graph): DiagramLayout {
  const main = mainPath(graph).map((n) => n.id);
  const order = new Map(graph.nodes.map((n, i) => [n.id, i + 1]));
  const colOf = new Map(main.map((id, i) => [id, 1 + i * 2]));
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const nodes: DiagramNode[] = [];
  const links: DiagramLayout["links"] = [];
  const branches: DiagramLayout["branches"] = [];
  const returns: DiagramLayout["returns"] = [];

  main.forEach((id, i) => {
    const n = byId.get(id)!;
    nodes.push({ id, label: n.label, kind: n.kind, detail: n.detail, num: order.get(id)!, col: colOf.get(id)!, row: 1 });
    if (i > 0) links.push({ col: colOf.get(id)! - 1, from: main[i - 1], to: id });
  });

  for (const n of graph.nodes) {
    if (colOf.has(n.id)) continue;
    const inEdge = graph.edges.find(([a, b]) => b === n.id && colOf.has(a));
    if (!inEdge) continue;
    const col = colOf.get(inEdge[0])!;
    nodes.push({ id: n.id, label: n.label, kind: n.kind, detail: n.detail, num: order.get(n.id)!, col, row: 3 });
    branches.push({ col, from: inEdge[0], to: n.id, label: inEdge[2] });
    const outEdge = graph.edges.find(([a, b]) => a === n.id && colOf.has(b));
    if (outEdge && colOf.get(outEdge[1])! > col) returns.push({ fromCol: col, toCol: colOf.get(outEdge[1])!, from: n.id, to: outEdge[1] });
  }

  const mainText = main.map((id) => byId.get(id)!.label).join(" → ");
  const branchText = branches
    .map((b) => {
      const back = returns.find((r) => r.from === b.to);
      return `${b.label ? `when ${b.label}, ` : ""}${byId.get(b.from)!.label} → ${byId.get(b.to)!.label}${back ? ` → ${byId.get(back.to)!.label}` : ""}`;
    })
    .join("; ");

  return {
    columns: main.length * 2 - 1,
    nodes: nodes.sort((a, b) => a.num - b.num),
    links,
    branches,
    returns,
    edgeCount: graph.edges.length,
    description: `Workflow: ${mainText}${branchText ? `; ${branchText}` : ""}.`,
  };
}
