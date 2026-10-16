import toolbox from "@/content/toolbox.json";
import { getProjects } from "@/lib/content/projects";
import { SectionHeader } from "./SectionHeader";
import { ToolButton } from "./ToolButton";
import home from "./home.module.css";
import styles from "./Toolbox.module.css";

/**
 * 07 — Toolbox (brief §5): not a logo wall — a dense mono "integrations" table, category → tools.
 * Each tool lists the runs that use it; hovering or focusing it highlights them in 04.
 * Not in the design canvas: built from its tokens (DESIGN_SPEC §7).
 */
export function Toolbox() {
  const projects = getProjects();
  const usedBy = (tool: string) => projects.filter((p) => p.stack.includes(tool)).map((p) => `#${p.runId}`);
  const total = toolbox.groups.reduce((n, g) => n + g.tools.length, 0);

  return (
    <section aria-labelledby="toolbox-h" className={`${home.section} ${styles.section}`} id="toolbox">
      <SectionHeader index="07" title="Toolbox" id="toolbox-h" meta={`${String(total).padStart(2, "0")} tools · hover to see where they ran`} />
      <div className={styles.grid}>
        {toolbox.groups.map((g) => (
          <div key={g.category} className={styles.group}>
            <h3 className={styles.category}>{g.category}</h3>
            <ul className={styles.list}>
              {g.tools.map((t) => (
                <li key={t}>
                  <ToolButton tool={t} runs={usedBy(t)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
