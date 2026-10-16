import { ContactEnhance } from "./ContactEnhance";
import styles from "./Contact.module.css";

const FIELDS = [
  { key: "task", n: "01", kind: "Trigger", label: "What should be automated?" },
  { key: "where", n: "02", kind: "Tool", label: "Where does it happen today?" },
  { key: "email", n: "03", kind: "Human", label: "Email" },
] as const;

/**
 * The contact form as a workflow trigger: three steps, ▶ Run, then the trace
 * "received → parsed → queued for [NAME]". Server-rendered and progressively enhanced: it
 * posts natively without JavaScript; with JavaScript it submits in place (validation, status,
 * trace), and that code loads only when the form comes near (keeps the home page in budget).
 */
export function ContactForm({ ownerName }: { ownerName: string }) {
  return (
    <form className={styles.form} action="/api/contact" method="post" data-contact-form aria-describedby="contact-status">
      {FIELDS.map((f) => {
        const id = `contact-${f.key}`;
        return (
          <div key={f.key} className={styles.field} data-field={f.key}>
            <label htmlFor={id} className={styles.label}>
              <span className={styles.kind}>
                <span aria-hidden="true" className={styles.mark} data-kind={f.kind} />
                {f.n}
              </span>
              {f.label}
            </label>
            {f.key === "task" ? (
              <textarea
                id={id}
                name="task"
                rows={3}
                required
                minLength={10}
                maxLength={2000}
                className={styles.textarea}
                placeholder="e.g. We copy invoices from Gmail into Xero every Friday"
              />
            ) : (
              <input
                id={id}
                name={f.key}
                type={f.key === "email" ? "email" : "text"}
                required={f.key === "email"}
                autoComplete={f.key === "email" ? "email" : "off"}
                maxLength={f.key === "email" ? 320 : 500}
                className={styles.input}
                placeholder={f.key === "email" ? "you@company.com" : "e.g. Gmail, a shared sheet, our ERP"}
              />
            )}
            <span id={`${id}-err`} className={styles.error} hidden />
          </div>
        );
      })}

      {/* honeypot — hidden from people and assistive tech */}
      <div aria-hidden="true" className={styles.honeypot}>
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="system" defaultValue="" />
      <p className={styles.attached} data-attached hidden>
        The system you sketched above is attached.
      </p>

      <div className={styles.submitRow}>
        <button type="submit" className={styles.run}>
          <span aria-hidden="true" className={styles.triangle} />
          <span data-run-label>Run</span>
        </button>
        <span className={styles.sentTrace} aria-hidden="true" data-trace>
          {["received", "parsed", `queued for ${ownerName}`].map((s, i) => (
            <span key={s} className={styles.sentStep} style={{ animationDelay: `${i * 480}ms` }}>
              {i > 0 && <span className={styles.sentConn} />}
              <span className={styles.sentMark} />
              {s}
            </span>
          ))}
        </span>
      </div>
      <p id="contact-status" role="status" aria-live="polite" className={styles.status} />
      <ContactEnhance />
    </form>
  );
}
