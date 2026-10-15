"use client";

import styles from "./Toolbox.module.css";

const emit = (tool: string | null) => window.dispatchEvent(new CustomEvent("toolbox:hover", { detail: tool }));

export function ToolButton({ tool, runs }: { tool: string; runs: string[] }) {
  return (
    <button
      type="button"
      className={styles.tool}
      data-tool={tool}
      onPointerEnter={() => emit(tool)}
      onPointerLeave={() => emit(null)}
      onFocus={() => emit(tool)}
      onBlur={() => emit(null)}
    >
      <span className={styles.toolName}>{tool}</span>
      <span className={styles.runs}>
        <span className="sr-only">{runs.length ? " — used in runs " : " — not used in the listed runs"}</span>
        {runs.length ? runs.join(" ") : <span aria-hidden="true">—</span>}
      </span>
    </button>
  );
}
