import process from "@/content/process.json";
import { SectionHeader } from "./SectionHeader";
import { ProcessPinned } from "./ProcessPinned";
import home from "./home.module.css";
import styles from "./Process.module.css";

export const PROCESS_KINDS = ["Trigger", "Model", "Tool", "Code", "Tool"] as const;

/**
 * 05 — Process: Trigger → Plan → Act → Verify → Ship. Not in the design canvas: built from
 * the same language (DESIGN_SPEC §7). Desktop: a pinned diagram that builds as you scroll.
 * Phones, reduced motion and no-JS: the stacked list (which is also the accessible version).
 */
export function Process() {
  const steps = process.steps;
  return (
    <section aria-labelledby="process-h" className={`${home.section} ${styles.section}`} id="process">
      <SectionHeader index="05" title="Process" id="process-h" meta={steps.map((s) => s.title).join(" → ")} />
      <ProcessPinned steps={steps} kinds={[...PROCESS_KINDS]} />
      <ol className={styles.stacked} data-process-list>
        {steps.map((s, i) => (
          <li key={s.id} className={styles.item}>
            <span className={styles.itemTop}>
              <span className={styles.kind}>
                <span aria-hidden="true" className={styles.mark} data-kind={PROCESS_KINDS[i]} />
                {PROCESS_KINDS[i]}
              </span>
              <span>0{i + 1}</span>
            </span>
            <h3 className={styles.itemTitle}>{s.title}</h3>
            <p className={styles.itemText}>{s.text}</p>
            <span className={styles.itemLog} aria-hidden="true">
              {s.log.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </span>
          </li>
        ))}
      </ol>
      <noscript>
        <style>{`[data-process-pin]{display:none!important}[data-process-list]{position:static!important;width:auto!important;height:auto!important;clip:auto!important;overflow:visible!important;display:grid!important}`}</style>
      </noscript>
    </section>
  );
}
