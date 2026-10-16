import { site } from "@/lib/content/site";
import { SectionHeader } from "./SectionHeader";
import { ContactForm } from "./ContactForm";
import { CopyEmail } from "./CopyEmail";
import home from "./home.module.css";
import styles from "./Contact.module.css";

/**
 * 08 — Contact, "Start a run" (brief §5). The form is styled as a workflow trigger. Not in the
 * design canvas: built from its tokens (DESIGN_SPEC §7). The footer below carries the design's
 * closing line ("Have work that should run itself?").
 */
export function Contact() {
  return (
    <section aria-labelledby="contact-h" className={`${home.section} ${styles.section}`} id="contact" data-rail-end>
      <SectionHeader index="08" title="Contact" meta="Start a run" asHeading={false} />
      <div className={styles.cols}>
        <div className={styles.left}>
          <h2 id="contact-h" className={styles.title}>
            Start a <em>run.</em>
          </h2>
          <p className={styles.lead}>Describe the work in your own words. I read every message myself and reply from</p>
          <CopyEmail email={site.email} />
          {site.bookingUrl ? (
            <a href={site.bookingUrl} className={styles.booking}>
              Book a call <span aria-hidden="true" className="nudge">→</span>
            </a>
          ) : (
            <span className={styles.bookingTodo}>Book a call · [booking link]</span>
          )}
        </div>
        <ContactForm ownerName={site.name} />
      </div>
    </section>
  );
}
