import type { CSSProperties } from "react";
import styles from "./GhostPointer.module.css";

/** The agent's ghost pointer (C1): a --signal arrow with an "agent · <action>" pill (Main.html). */
export function GhostPointer({ label, style }: { label: string; style?: CSSProperties }) {
  return (
    <span aria-hidden="true" className={styles.pointer} style={style}>
      <svg width="22" height="24" viewBox="0 0 22 24">
        <path d="M2 2 L2 19 L7 14.5 L10.5 22 L13.5 20.6 L10 13.2 L17 13 Z" />
      </svg>
      <span className={styles.pill}>{label}</span>
    </span>
  );
}
