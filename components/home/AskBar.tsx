import Link from "next/link";
import styles from "./AskBar.module.css";

/** Phone: the bottom "Ask the agent" bar (Mobile.html). Opens the agent; without JS it links to section 06. */
export function AskBar() {
  return (
    <Link href="/#agent" className={styles.bar} data-askbar data-agent-open>
      <span className={styles.label}>
        <span aria-hidden="true" className={styles.sq} />
        Ask the agent
      </span>
      <span className={styles.meta} aria-hidden="true">
        ⌘K · live
      </span>
    </Link>
  );
}
