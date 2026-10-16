"use client";

import styles from "./GridOverlay.module.css";

/** The 12-column grid, toggled with Shift+G (dev aid + easter egg); loaded on first use. */
export default function GridOverlay() {
  return (
    <div aria-hidden="true" className={styles.overlay}>
      <div className={styles.grid}>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  );
}
