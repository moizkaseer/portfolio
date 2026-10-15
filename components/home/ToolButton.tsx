import styles from "./Toolbox.module.css";

/** A tool in 07; hover / focus highlights the runs that use it (handled by the idle-loaded HomeEnhance). */
export function ToolButton({ tool, runs }: { tool: string; runs: string[] }) {
  return (
    <button type="button" className={styles.tool} data-tool={tool}>
      <span className={styles.toolName}>{tool}</span>
      <span className={styles.runs}>
        <span className="sr-only">{runs.length ? " — used in runs " : " — not used in the listed runs"}</span>
        {runs.length ? runs.join(" ") : <span aria-hidden="true">—</span>}
      </span>
    </button>
  );
}
