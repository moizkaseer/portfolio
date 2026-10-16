"use client";

import { Fragment, useEffect, useRef, useSyncExternalStore } from "react";
import { deriveVisuals, LOG_ROWS } from "@/lib/motion/hero-motion";
import { NavClock } from "@/components/nav/NavClock";
import type { Site } from "@/lib/content/site";
import { useHeroEngine, useLayout } from "./useHeroEngine";
import { getPromptOverlay, prefillContact, setPromptState, subscribePromptOverlay, systemSummary } from "@/lib/prompt-store";
import { FREEZE_ALLOWED } from "@/lib/freeze";
import styles from "./HeroStage.module.css";

const LINES = [
  { cls: styles.l1, tag: "01 TRIGGER", text: "I build" },
  { cls: styles.l2, tag: "02 PLAN", text: "agents" },
  { cls: styles.l3, tag: "03 ACT", text: "that do" },
] as const;


/**
 * 01 Hero ("Circuit type") + 02 "Your turn" on one fixed-coordinate stage
 * (1440 × 1840 desktop, 390 × 1970 phone), scaled uniformly with the viewport.
 * Sources: design-reference/source/HeroCombo.html and HeroComboMobile.html.
 */
// the smart engine (C2) loads on first use of the input, and only when a model is configured
let smartModule: Promise<typeof import("@/lib/prompt/smart")> | null = null;
const loadSmart = () => (smartModule ??= import("@/lib/prompt/smart"));

export function HeroStage({ site, smart = false }: { site: Pick<Site, "city" | "timezone" | "heroStats" | "summary">; smart?: boolean }) {
  const { stageRef, packetRef, packetStyle, state, mode, isStatic, onFocus, onType, runUser, beginDesign, templates } = useHeroEngine();
  const layout = useLayout();
  const v = deriveVisuals(state, mode);
  const { hero } = v;
  const overlay = useSyncExternalStore(subscribePromptOverlay, getPromptOverlay, () => null);
  const prompt = overlay && state.tpl === -2 ? overlay(v.prompt) : v.prompt;

  const smartOn = () => smart || (FREEZE_ALLOWED && new URLSearchParams(location.search).has("smart"));
  const request = useRef(0);
  /** Enter / Generate: the smart engine when configured (≤ 2.5s, else silent fallback), the instant templates otherwise. */
  const submit = async (text: string) => {
    const id = ++request.current;
    if (!smartOn() || !text.trim()) return runUser(text);
    beginDesign(text);
    const m = await loadSmart();
    const nodes = await m.smartNodes(text);
    if (id !== request.current) return; // the visitor moved on
    m.showSmart(nodes);
    runUser(text, nodes ? -2 : undefined);
  };

  // "Build this with me →": prefill the contact form with the task and its generated steps (C2)
  const buildThis = () => {
    const task = prompt.typed || templates[Math.max(0, state.tpl >= 0 ? state.tpl : state.nextTpl)]?.prompt || "";
    const nodes = prompt.nodes.map((n) => ({ kind: n.kind, title: n.title }));
    prefillContact({ summary: systemSummary(task, nodes), system: { task, nodes } });
  };

  // remember the visitor's system for the agent (get_prompt_state)
  const built = mode === "user" && state.phase === "done";
  useEffect(() => {
    if (built && state.typed.trim())
      setPromptState({
        task: state.typed,
        nodes: prompt.nodes.map((n) => ({ kind: n.kind, title: n.title })),
        source: state.tpl !== -2 ? "template" : overlay ? "smart" : "generic",
      });
  }, [built, state.typed, state.tpl, prompt.nodes, overlay]);

  const announcement =
    mode === "user" && state.phase === "done"
      ? `Generated 5 steps: ${prompt.nodes.map((n) => n.title.toLowerCase()).join(", then ")}.`
      : "";

  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <div ref={stageRef} className={`hero-tokens ${styles.stage}`} data-static={isStatic} data-hero-stage>
          {/* Wires and nodes — desktop (DESIGN_SPEC §3.2) */}
          <svg aria-hidden="true" className={styles.wiresD} width="1440" height="1840" viewBox="0 0 1440 1840">
            <g className={styles.guide} strokeDasharray="2 6">
              <path d="M150 100 V730" />
              <path d="M300 100 V730" />
              <path d="M450 100 V730" />
              <path d="M600 100 V730" />
            </g>
            <path className={styles.inputWire} d="M-1440 198 H0" />
            <path className={styles.inputWire} d="M0 198 H105" />
            <path className={styles.wire} data-wire="seg0" data-lit={hero.wireLit.seg0} d="M110 203 V332 H255" />
            <path className={styles.wire} data-wire="seg1" data-lit={hero.wireLit.seg1} d="M260 337 V466 H405" />
            <path className={styles.wire} data-wire="seg2" data-lit={hero.wireLit.seg2} d="M410 471 V600 H555" />
            <path className={styles.wire} data-wire="out" data-lit={hero.wireLit.out} d="M560 605 V700 H1394" />
            <path className={`${styles.wire} ${styles.rail}`} data-wire="rail" data-lit={hero.wireLit.rail} d="M1400 706 V1300 H1376" />
            {[
              [104, 192],
              [254, 326],
              [404, 460],
              [554, 594],
            ].map(([x, y], i) => (
              <rect key={i} className={styles.node} data-node={i} data-state={hero.nodes[i]} x={x} y={y} width="12" height="12" />
            ))}
            <rect className={styles.node} data-node="shipped" data-state={hero.shippedNodeLit ? "running" : "pending"} x="1394" y="694" width="12" height="12" />
            <text className={styles.shippedLabel} x="1380" y="684">
              SHIPPED · NEXT RUN IS YOURS ↓
            </text>
          </svg>

          {/* Wires and nodes — phone (DESIGN_SPEC §8) */}
          <svg aria-hidden="true" className={styles.wiresM} width="390" height="1970" viewBox="0 0 390 1970">
            <g className={styles.guide} strokeDasharray="2 5">
              <path d="M44 110 V430" />
              <path d="M72 110 V430" />
              <path d="M100 110 V430" />
              <path d="M128 110 V430" />
            </g>
            <path className={styles.inputWire} d="M-390 155 H0" />
            <path className={styles.inputWire} d="M0 155 H17" />
            <path className={styles.wire} data-lit={hero.wireLit.seg0} d="M22 160 V233 H45" />
            <path className={styles.wire} data-lit={hero.wireLit.seg1} d="M50 238 V311 H73" />
            <path className={styles.wire} data-lit={hero.wireLit.seg2} d="M78 316 V389 H101" />
            <path className={styles.wire} data-lit={hero.wireLit.out} d="M106 394 V446 H377" />
            <path className={`${styles.wire} ${styles.rail}`} data-lit={hero.wireLit.rail} d="M382 451 V1283 H374" />
            {[
              [17, 150],
              [45, 228],
              [73, 306],
              [101, 384],
            ].map(([x, y], i) => (
              <rect key={i} className={styles.node} data-state={hero.nodes[i]} x={x} y={y} width="10" height="10" />
            ))}
            <rect className={styles.node} data-state={hero.shippedNodeLit ? "running" : "pending"} x="377" y="441" width="10" height="10" />
            <text className={styles.shippedLabel} x="368" y="434">
              SHIPPED · YOURS ↓
            </text>
          </svg>

          {/* The packet (§3.3) — positioned every frame by the engine. */}
          <span
            ref={packetRef}
            aria-hidden="true"
            className={styles.packet}
            data-packet
            style={packetStyle}
          />

          <section aria-label="Intro">
            <p className={styles.meta}>
              <span>AI agents &amp; automation</span>
              <span>
                <span className={styles.ink}>Online</span> · {site.city} <NavClock timezone={site.timezone} />
              </span>
            </p>

            {/* The headline is the workflow. Tags are visual only; the h1 reads "I build agents that do the work." */}
            <h1 className={styles.h1}>
              {LINES.map((l, i) => (
                <span key={l.tag} className={`${styles.line} ${l.cls}`} data-line={i} data-status={hero.lines[i]}>
                  <span aria-hidden="true" className={styles.tag}>
                    {l.tag} · {hero.lines[i]}
                  </span>
                  {l.text}{" "}
                </span>
              ))}
              <em className={`${styles.line} ${styles.l4}`} data-line={3} data-status={hero.lines[3]}>
                <span aria-hidden="true" className={styles.tag}>
                  04 SHIP · {hero.lines[3]}
                </span>
                the work.
              </em>
            </h1>

            {/* Live run panel (§3.4) — a demo; its content is also a visually hidden list. */}
            <div aria-hidden="true" className={styles.panel} data-geo="panel">
              <div className={styles.panelHead}>
                <span className={styles.panelTitle}>
                  <span className={styles.sq} />
                  Live run · demo
                </span>
                <span data-panel-label>
                  <span className={styles.dOnly} data-panel-d>
                    {hero.panelLabel}
                  </span>
                  <span className={styles.mOnly} data-panel-m>
                    {hero.panelLabelMobile}
                  </span>
                </span>
              </div>
              <div className={styles.panelBody} data-log>
                {hero.logRows.map((r, i) => (
                  <div key={r.step} className={styles.row} data-new={i === hero.logRows.length - 1}>
                    <span className={styles.rowTime}>
                      <span className={styles.dOnly}>{r.time}</span>
                      <span className={styles.mOnly}>{r.short}</span>
                    </span>
                    <span>{r.step}</span>
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <ol className="sr-only" aria-label="Demo run log">
              {LOG_ROWS.map((r) => (
                <li key={r.step}>
                  {r.time} {r.step}: {r.text}
                </li>
              ))}
            </ol>

            <p className={styles.sub} data-geo="sub">
              {site.summary}
            </p>
            <div className={styles.ctas} data-geo="ctas">
              <a href="#contact" className={styles.btnPrimary}>
                <span className="roll" data-label="Start a project">
                  <span>Start a project</span>
                </span>{" "}
                <span aria-hidden="true" className="nudge">
                  →
                </span>
              </a>
              <a href="#your-turn" className={styles.btnGhost}>
                <span className="roll" data-label="Try it on your task">
                  <span>Try it on your task</span>
                </span>
                {" "}
                <span aria-hidden="true">↓</span>
              </a>
            </div>
            {site.heroStats.length > 0 && (
              <dl className={styles.stats} data-geo="stats">
                {site.heroStats.map((s) => (
                  <div key={s.label} className={styles.stat}>
                    <dt>{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {/* 02 — Your turn (§4, C2) */}
          <section aria-labelledby="your-turn-h">
            <span id="your-turn" className={styles.anchor} />
            <div className={styles.secHead} data-geo="secHead">
              <span>02 — Your turn</span>
              <span className={styles.muted}>
                <span className={styles.dOnly}>Describe a task · see the system I would build</span>
                <span className={styles.mOnly}>Try it</span>
              </span>
            </div>
            <p className={styles.kicker} data-geo="kicker">That was one of mine. Now yours.</p>
            <h2 id="your-turn-h" className={styles.h2} data-geo="h2">
              <span>What should</span> <em>run itself?</em>
            </h2>

            <div className={styles.inputRow} data-geo="inputRow" data-underline data-lit={prompt.underlineLit}>
              <span aria-hidden="true" className={styles.chev} data-chevron data-lit={prompt.chevronLit}>
                ›
              </span>
              <label htmlFor="task-input" className="sr-only">
                Describe a task you want automated
              </label>
              <input
                id="task-input"
                className={styles.input}
                type="text"
                autoComplete="off"
                value={prompt.typed}
                placeholder={layout === "desktop" ? "Describe something your team does by hand…" : "Describe a task…"}
                onFocus={() => {
                  if (smartOn()) void loadSmart();
                  onFocus();
                }}
                onChange={(e) => {
                  request.current++;
                  onType(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit(e.currentTarget.value);
                }}
              />
              <button type="button" className={styles.gen} onClick={() => void submit(state.typed)}>
                <span className={styles.genWord}>Generate{" "}</span>
                <span aria-hidden="true">↵</span>
              </button>
            </div>

            <div className={styles.chips} data-geo="chips">
              <span className={styles.tryLabel}>Try</span>
              {templates.map((t, i) => (
                <button
                  key={t.chip}
                  type="button"
                  className={styles.chip}
                  data-selected={prompt.selectedChip === i}
                  aria-pressed={prompt.selectedChip === i}
                  onClick={() => {
                    request.current++;
                    runUser(t.prompt, i);
                  }}
                >
                  {t.chip}
                </button>
              ))}
            </div>

            <div className={styles.statusBlock} data-geo="statusBlock">
              <div className={styles.statusRow}>
                <span className={styles.statusLeft}>
                  <span className={styles.sq} />
                  <span className={styles.dOnly} data-status-text>
                    {prompt.status}
                  </span>
                  <span className={styles.mOnly} data-status-text-m>
                    {prompt.statusMobile}
                  </span>
                </span>
                <span>
                  <span className={styles.dOnly} data-summary>
                    {prompt.summary}
                  </span>
                  <span className={styles.mOnly} data-summary-m>
                    {prompt.summaryMobile}
                  </span>
                </span>
              </div>
              <div className={styles.nodes} data-nodes data-geo="nodes">
                {prompt.nodes.map((n, i) => (
                  <Fragment key={i}>
                    {n.connectorIn && (
                      <span aria-hidden="true" className={styles.conn} data-drawn={n.connectorIn.drawn}>
                        <span className={styles.connPacket} data-on={n.connectorIn.packet} />
                      </span>
                    )}
                    <div
                      className={styles.box}
                      data-box={i}
                      data-shown={n.shown}
                      data-border={n.border}
                      data-dashed={n.dashed}
                      aria-hidden={!n.shown}
                      data-ghost={!n.shown || undefined}
                    >
                      <span className={styles.boxTop}>
                        <span className={styles.kind}>
                          <span aria-hidden="true" className={styles.mark} data-kind={n.kind} data-active={n.markActive} />
                          {n.kind}
                        </span>
                        <span>0{n.num}</span>
                      </span>
                      <span className={styles.title} data-title>
                        {n.title}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>

            <div className={styles.cta} data-geo="cta">
              <p className={styles.ctaText}>
                This is how I start every project: map the work, decide where a model helps, where code is safer, and where a
                person stays in the loop.
              </p>
              <div className={styles.ctaBtns}>
                <a href="#work" className={styles.seeRuns}>
                  <span className="roll" data-label="See real runs">
                    <span>See real runs</span>
                  </span>
                </a>
                <a href="#contact" className={styles.build} onClick={buildThis}>
                  <span className="roll" data-label="Build this with me">
                    <span>Build this with me</span>
                  </span>{" "}
                  <span aria-hidden="true" className="nudge">
                    →
                  </span>
                </a>
              </div>
            </div>

            <p className="sr-only" aria-live="polite">
              {announcement}
            </p>
          </section>
        </div>
      </div>
      <noscript>
        <style>{`[data-hero-stage] [data-status] { color: var(--ink) !important; -webkit-text-stroke: 0 !important; }`}</style>
      </noscript>
    </div>
  );
}
