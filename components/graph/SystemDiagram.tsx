"use client";

import type { DiagramLayout, DiagramNode } from "@/lib/graph/diagram-layout";
import { nodeStates, useReplay } from "@/components/run/ReplayContext";
import styles from "./SystemDiagram.module.css";

type State = "done" | "running" | "pending";

function Box({ n, state }: { n: DiagramNode; state: State }) {
  return (
    <div
      className={styles.box}
      data-state={state}
      data-human={n.kind === "Human"}
      style={{ gridColumn: n.col, gridRow: n.row }}
      data-node={n.id}
    >
      <span className={styles.top}>
        <span className={styles.kind}>
          <span className={styles.mark} />
          {n.kind}
          {state === "running" && " · running"}
        </span>
        <span>{String(n.num).padStart(2, "0")}</span>
      </span>
      <span className={styles.label}>{n.label}</span>
      {n.detail && <span className={styles.detail}>{n.detail}</span>}
    </div>
  );
}

/**
 * The run report's architecture diagram (RunReport.html), from the project's graph.json via a
 * build-time layout. Node states follow the trace replay below it. Phones get the same graph
 * stacked vertically.
 */
export function SystemDiagram({ layout }: { layout: DiagramLayout }) {
  const replay = useReplay();
  const states = nodeStates(replay);
  const state = (id: string): State => states.get(id) ?? (replay ? "pending" : "done");
  const lit = (to: string) => state(to) !== "pending";
  const hasBranch = layout.branches.length > 0;
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const mainNodes = layout.nodes.filter((n) => n.row === 1).sort((a, b) => a.col - b.col);

  return (
    <>
      <div
        role="img"
        aria-label={layout.description}
        className={styles.grid}
        style={{
          gridTemplateColumns: Array.from({ length: layout.columns }, (_, i) => (i % 2 ? "64px" : "minmax(0, 1fr)")).join(" "),
          gridTemplateRows: hasBranch ? "auto 72px auto" : "auto",
        }}
      >
        {layout.nodes.map((n) => (
          <Box key={n.id} n={n} state={state(n.id)} />
        ))}
        {layout.links.map((l) => (
          <div key={l.col} className={styles.link} data-lit={lit(l.to)} style={{ gridColumn: l.col, gridRow: 1 }}>
            {state(l.to) === "running" && <span className={styles.packet} />}
          </div>
        ))}
        {layout.branches.map((b) => (
          <div key={b.to} className={styles.branch} style={{ gridColumn: b.col, gridRow: 2 }}>
            <span className={styles.dashed} />
            {b.label && <span className={styles.branchLabel}>{b.label}</span>}
          </div>
        ))}
        {layout.returns.map((r) => (
          <ReturnPath key={r.from} r={r} lit={state(r.from) === "done"} />
        ))}
      </div>

      {/* phones: the same graph, stacked */}
      <ol className={styles.stack} aria-hidden="true">
        {mainNodes.map((n, i) => {
          const branch = layout.branches.find((b) => b.from === n.id);
          const side = branch ? byId.get(branch.to) : undefined;
          return (
            <li key={n.id} className={styles.stackItem}>
              {i > 0 && <span className={styles.vlink} data-lit={lit(n.id)} />}
              <Box n={{ ...n, col: 1, row: 1 }} state={state(n.id)} />
              {side && (
                <span className={styles.stackBranch}>
                  <span className={styles.vdashed} />
                  {branch?.label && <span className={styles.branchLabel}>{branch.label}</span>}
                  <Box n={{ ...side, col: 1, row: 1 }} state={state(side.id)} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

function ReturnPath({ r, lit }: { r: DiagramLayout["returns"][number]; lit: boolean }) {
  const cells = [];
  for (let c = r.fromCol + 1; c < r.toCol; c++) {
    cells.push(<div key={`h${c}`} className={styles.hline} data-lit={lit} style={{ gridColumn: c, gridRow: 3 }} />);
  }
  return (
    <>
      {cells}
      <div className={styles.elbow} data-lit={lit} style={{ gridColumn: r.toCol, gridRow: 3 }}>
        <span className={styles.elbowH} />
        <span className={styles.elbowV}>
          <span />
          <span />
        </span>
      </div>
      <div className={styles.up} data-lit={lit} style={{ gridColumn: r.toCol, gridRow: 2 }}>
        <span />
      </div>
    </>
  );
}
