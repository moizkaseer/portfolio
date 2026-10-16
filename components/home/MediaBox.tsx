import styles from "./MediaBox.module.css";

/**
 * A real screenshot of the run's system (the project's `media`). Runs without one show no box.
 * It clips in from the row's edge when the row opens (clip-path, expo.out). A plain <img>:
 * next/image's client code would push the home page past its JS budget.
 */
export function MediaBox({ media, compact = false, reveal = false }: { media?: { src: string; alt: string }; compact?: boolean; reveal?: boolean }) {
  if (!media) return null;
  return (
    <div className={compact ? `${styles.media} ${styles.compact}` : styles.media} data-reveal={reveal}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.src} alt={media.alt} loading="lazy" decoding="async" className={styles.image} />
    </div>
  );
}
