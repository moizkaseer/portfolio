import { agentConfigured } from "@/lib/server/agent-model";
import { getProjects } from "@/lib/content/projects";
import { SectionHeader } from "./SectionHeader";
import home from "./home.module.css";
import styles from "./AgentSection.module.css";

const CHIPS = ["Show me your best project", "What do you build?", "How do you make agents reliable?", "Are you available?"];

/**
 * 06 — Talk to my agent (Main.html). The terminal shows the design's example session until the
 * visitor interacts: then the agent (loaded on demand) takes it over with the real conversation.
 * Without a configured model it runs the scripted demo replay, and says so.
 */
export function AgentSection() {
  const live = agentConfigured();
  const projects = getProjects();
  const featured = projects.find((p) => p.featured) ?? projects[0];
  const trace = [
    { call: 'search_projects(sort: "impact")', result: `142ms · ${projects.length} result${projects.length === 1 ? "" : "s"}`, state: "done" },
    { call: 'ui.scroll_to("work")', result: "done", state: "done" },
    { call: `ui.highlight_project("${featured.slug}")`, result: "running", state: "running" },
    { call: `ui.open_project("${featured.slug}")`, result: "queued", state: "queued" },
  ] as const;
  return (
    <section aria-labelledby="agent-h" className={`${home.section} ${styles.section}`} id="agent">
      <SectionHeader index="06" title="Talk to my agent" asHeading={false} meta={
          <span data-agent-mode data-agent-mode-live="Live · reads only my case studies" data-agent-mode-demo="Demo replay · reads only my case studies">
            {live ? "Live · reads only my case studies" : "Demo replay · reads only my case studies"}
          </span>
        } />
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
              <button key={c} type="button" className={i === 0 ? styles.chipFilled : styles.chip} data-agent-ask={c}>
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
          <div className={styles.termBody} aria-label="Example session from the design" role="log">
            <div className={styles.user}>show me your best project</div>
            {trace.map((t) => (
              <div key={t.call} className={styles.tool} data-state={t.state}>
                <span className={styles.call}>
                  <span aria-hidden="true" className={styles.dot} />
                  {t.call}
                </span>
                <span className={styles.result}>{t.result}</span>
              </div>
            ))}
            <p className={styles.answer}>
              This is RUN #{featured.runId}, {featured.title}. I have highlighted it on the page and I am opening the full run report next.
              <span aria-hidden="true" className={styles.cursor} />
            </p>
          </div>
          <div className={styles.inputRow}>
            <label htmlFor="ask-agent" className="sr-only">
              Ask the agent
            </label>
            <input id="ask-agent" type="text" className={styles.input} placeholder="Ask the agent anything…" data-agent-input maxLength={500} />
            <button type="button" className={styles.send} data-agent-open>
              Send ↵
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
