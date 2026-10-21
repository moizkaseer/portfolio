import Link from "next/link";
import type { AgentMode } from "@/lib/agent/mode";
import styles from "./AskBar.module.css";

/**
 * Phone: the bottom "Ask the agent" bar (Mobile.html). Opens the agent; without JS it links to
 * section 06. Stays a server component (no JS of its own): `[data-agent-mode]` is kept in sync
 * by CommandPaletteLauncher, which already probes the agent's real mode for the agent itself.
 */
export function AskBar({ initialMode }: { initialMode: AgentMode }) {
  return (
    <Link href="/#agent" className={styles.bar} data-askbar data-agent-open>
      <span className={styles.label}>
        <span aria-hidden="true" className={styles.sq} />
        Ask the agent
      </span>
      <span className={styles.meta} aria-hidden="true">
        ⌘K · <span data-agent-mode>{initialMode}</span>
      </span>
    </Link>
  );
}
