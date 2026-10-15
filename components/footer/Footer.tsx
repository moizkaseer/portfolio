import Link from "next/link";
import { site } from "@/lib/content/site";
import { Deferred } from "@/components/Deferred";
import styles from "./Footer.module.css";

const year = new Date(process.env.BUILD_DATE ?? Date.now()).getUTCFullYear();

/** Footer from Main.html (DESIGN_SPEC §5). The wordmark scrub reveal arrives in Phase 3. */
export function Footer() {
  return (
    <footer className={`frame ${styles.footer}`}>
      <div className={styles.top}>
        <p className={styles.closing}>
          Have work that should <em>run itself?</em>
        </p>
        <div className={styles.actions}>
          <a href={`mailto:${site.email}`} className={styles.email}>
            {site.email}
          </a>
          <Link href="/#contact" className={styles.run}>
            <span aria-hidden="true" className={styles.triangle} />
            Start a run
          </Link>
        </div>
      </div>

      <div aria-hidden="true" className={styles.wordmark} data-wordmark>
        <span className={styles.wordmarkInner}>{site.name}</span>
      </div>
      <Deferred name="wordmark" />

      <div className={styles.bottom}>
        <span>
          © {year} {site.name}
        </span>
        <span>
          {site.socials.map((s, i) => (
            <span key={s.label}>
              {i > 0 && " · "}
              {s.url ? (
                <a href={s.url} className="text-link" rel="me">
                  {s.label}
                </a>
              ) : (
                s.label
              )}
            </span>
          ))}
        </span>
        <span>
          Try <span className={styles.curl}>curl {site.domain}</span>
        </span>
        <span>Built with a few agents helping</span>
      </div>
    </footer>
  );
}
