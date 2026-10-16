import Link from "next/link";
import { site } from "@/lib/content/site";
import { NAV_LINKS } from "./nav-links";
import { NavClock } from "./NavClock";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";
import styles from "./Nav.module.css";

/**
 * Global nav — the full nav from Main.html on every page (DESIGN_SPEC §2), the phone
 * nav from HeroComboMobile.html below 1024px. Fixed, on the page background, so at the
 * top of the page it sits exactly where the design puts it.
 */
export function Nav() {
  const available = site.availability.status === "available";

  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span aria-hidden="true" className={styles.brandMark} />
          {site.name}
        </Link>

        <nav aria-label="Primary" className={styles.links}>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={styles.link} prefetch={l.built ? undefined : false} data-nav={l.label.toLowerCase()}>
              <span className={styles.index}>{l.index}</span> {l.label}
            </Link>
          ))}
        </nav>

        <div className={styles.meta}>
          <span className={styles.muted}>
            {site.city} <NavClock timezone={site.timezone} />
          </span>
          <span className={styles.status}>
            <span aria-hidden="true" className={available ? "led" : `led ${styles.ledBooked}`} />
            {site.availability.label}
          </span>
          <ThemeToggle className={styles.toggle} />
        </div>

        <div className={styles.phone}>
          <span
            role="img"
            aria-label={site.availability.label}
            className={available ? "led" : `led ${styles.ledBooked}`}
          />
          <MobileMenu city={site.city} timezone={site.timezone} statusLabel={site.availability.label} />
        </div>
      </div>
    </header>
  );
}
