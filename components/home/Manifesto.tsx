import { SectionHeader } from "./SectionHeader";
import { Deferred } from "@/components/Deferred";
import home from "./home.module.css";
import styles from "./Manifesto.module.css";

const SCRUBBED = ["Systems", "your", "team", "actually"];

/** 03 — How I work (Main.html manifesto). */
export function Manifesto() {
  return (
    <section aria-labelledby="manifesto-h" className={`${home.section} ${styles.section}`} id="manifesto">
      <SectionHeader
        index="03"
        title="How I work"
        id="manifesto-h"
        meta="03 / 08"
        mark={{ left: "22%", width: "16%" }}
      />
      <p className={styles.text} data-manifesto>
        <span data-reveal-lines>
          Agents that fail loudly. Automations with an off{" "}switch.{" "}
          <span className={styles.scrubbed} data-scrub>
            {SCRUBBED.map((w, i) => (
              <span key={w} className={styles.word} data-word={i}>
                {w}{" "}
              </span>
            ))}
            <em className={styles.word} data-word={SCRUBBED.length}>
              trusts.
            </em>
          </span>
        </span>
      </p>
      <Deferred name="manifesto" />
    </section>
  );
}
