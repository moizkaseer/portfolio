import styles from "./AskBar.module.css";

/** Phone: the bottom "Ask the agent" bar (Mobile.html). Until Phase 5 it takes you to the agent section. */
export function AskBar() {
  return (
    <a href="#agent" className={styles.bar} data-askbar>
      <span className={styles.label}>
        <span aria-hidden="true" className={styles.sq} />
        Ask the agent
      </span>
      <span className={styles.meta} aria-hidden="true">
        ⌘K · live
      </span>
    </a>
  );
}
