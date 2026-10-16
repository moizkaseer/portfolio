import styles from "./MediaBox.module.css";

/**
 * The run's screen recording. Until the owner provides recordings this is the design's own
 * placeholder ([Screen recording of the system]). It clips in from the row's edge when the
 * row opens (clip-path, expo.out).
 */
export function MediaBox({ compact = false, reveal = false }: { compact?: boolean; reveal?: boolean }) {
  return (
    <div className={compact ? `${styles.media} ${styles.compact}` : styles.media} data-reveal={reveal} aria-label="Screen recording — coming soon" role="img">
      <span className={styles.top}>
        <span>Loop · muted</span>
        <span>00:07 / 00:15</span>
      </span>
      <span className={styles.label}>{compact ? "[Screen recording]" : "[Screen recording of the system]"}</span>
      <span className={styles.progress}>
        <span />
      </span>
    </div>
  );
}
