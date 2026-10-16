import styles from "./SectionHeader.module.css";

interface Mark {
  /** design decoration: an ink segment on the hairline and a signal square (Main.html / Mobile.html) */
  left: string;
  width: string;
}

/**
 * Mono section header row: "03 — How I work" left, meta right, hairline below (DESIGN_SPEC §5).
 * The C3 rail ticks into its hairline ([data-rail-tick]).
 */
export function SectionHeader({
  index,
  title,
  meta,
  id,
  asHeading = true,
  mark,
  markMobile,
}: {
  index: string;
  title: string;
  meta?: React.ReactNode;
  id?: string;
  asHeading?: boolean;
  mark?: Mark;
  markMobile?: Mark;
}) {
  const label = `${index} — ${title}`;
  return (
    <div className={styles.header} data-rail-tick>
      {asHeading ? (
        <h2 id={id} className={styles.title}>
          {label}
        </h2>
      ) : (
        <span id={id}>{label}</span>
      )}
      {meta && <span className={styles.meta}>{meta}</span>}
      {mark && (
        <span className={styles.dOnly} aria-hidden="true">
          <span className={styles.segment} style={{ left: mark.left, width: mark.width }} />
          <span className={styles.dot} style={{ left: `calc(${mark.left} + ${mark.width})` }} />
        </span>
      )}
      {markMobile && (
        <span className={styles.mOnly} aria-hidden="true">
          <span className={styles.segment} style={{ left: markMobile.left, width: markMobile.width }} />
          <span className={styles.dot} style={{ left: `calc(${markMobile.left} + ${markMobile.width})` }} />
        </span>
      )}
    </div>
  );
}
