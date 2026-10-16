import styles from "@/app/not-found.module.css";

// The not-found boundary ships with every page, so this stays a server component (no JS in the
// home budget): the 404 is prerendered once for every unknown address, and a tiny inline script
// writes the requested path into the log as the page is parsed.
const PATH_SCRIPT = `document.getElementById("nf-path").textContent=location.pathname`;

/** The failed run's log, with the path the visitor asked for. */
export function FailedTrace() {
  const rows = [
    { step: "trigger", text: null, state: "past" },
    { step: "route", text: "no page matches this address", state: "past" },
    { step: "error", text: "404 · route not found", state: "current" },
    { step: "retry", text: "↻ waiting for you", state: "future" },
  ];
  return (
    <div className={styles.term} role="group" aria-label="Run log">
      <div className={styles.termHead}>
        <span>run_404</span>
        <span className={styles.termStatus}>
          <span aria-hidden="true" className={styles.sq} />
          Failed · 3 / 4
        </span>
      </div>
      <ol className={styles.rows}>
        {rows.map((r) => (
          <li key={r.step} className={styles.row} data-state={r.state}>
            <span className={styles.time}>{r.state === "future" ? "—" : "00:00.0"}</span>
            <span>{r.step}</span>
            <span>
              {r.text ?? (
                <>
                  GET{" "}
                  <span id="nf-path" suppressHydrationWarning>
                    this address
                  </span>
                  <script dangerouslySetInnerHTML={{ __html: PATH_SCRIPT }} />
                </>
              )}
              {r.state === "current" && <span aria-hidden="true" className={styles.cursor} />}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
