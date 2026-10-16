import { SectionHeader } from "./SectionHeader";
import home from "./home.module.css";
import styles from "./AgentSection.module.css";

const CHIPS = ["Show me your best project", "What do you build?", "How do you make agents reliable?", "Are you available?"];

const TRACE = [
  { call: 'search_projects(sort: "impact")', result: "142ms · 4 results", state: "done" },
  { call: 'ui.scroll_to("work")', result: "done", state: "done" },
  { call: 'ui.highlight_project("[slug]")', result: "running", state: "running" },
  { call: 'ui.open_project("[slug]")', result: "queued", state: "queued" },
] as const;

/**
 * 06 — Talk to my agent (Main.html). Phase 3 ships the section as designed with the design's
 * example session; Phase 5 connects the live agent, its tools and the UI actions (C1).
 */
export function AgentSection() {
  return (
    <section aria-labelledby="agent-h" className={`${home.section} ${styles.section}`} id="agent">
      <SectionHeader index="06" title="Talk to my agent" asHeading={false} meta="Live · reads only my case studies" />
      <div className={styles.cols}>
        <div className={styles.left}>
          <h2 id="agent-h" className={styles.title}>
            Ask it about my work. It will <em>show</em> you.
          </h2>
          <p className={styles.lead}>
            It answers from my case studies, shows every tool call it makes, and can take you straight to what you are looking for.
          </p>
          <div className={styles.chips}>
            {CHIPS.map((c, i) => (
              <button key={c} type="button" className={i === 0 ? styles.chipFilled : styles.chip} aria-disabled="true" title="The live agent is connected in Phase 5">
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.term} data-agent-terminal>
          <div className={styles.termHead}>
            <span>Agent · session 3f2a</span>
            <span className={styles.acting}>
              <span aria-hidden="true" className={styles.sq} />
              Acting on the page
            </span>
          </div>
          <div className={styles.termBody} aria-label="Example session" role="log">
            <div className={styles.user}>show me your best project</div>
            {TRACE.map((t) => (
              <div key={t.call} className={styles.tool} data-state={t.state}>
                <span className={styles.call}>
                  <span aria-hidden="true" className={styles.dot} />
                  {t.call}
                </span>
                <span className={styles.result}>{t.result}</span>
              </div>
            ))}
            <p className={styles.answer}>
              This is RUN #011, [Invoice extraction pipeline]. I have highlighted it on the page and I am opening the full run report next.
              <span aria-hidden="true" className={styles.cursor} />
            </p>
          </div>
          <div className={styles.inputRow}>
            <label htmlFor="ask-agent" className="sr-only">
              Ask the agent
            </label>
            <input id="ask-agent" type="text" className={styles.input} placeholder="Ask the agent anything…" disabled />
            <button type="button" className={styles.send} aria-disabled="true">
              Send ↵
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
