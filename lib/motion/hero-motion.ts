/**
 * hero-motion.ts — the exact motion of the approved hero + "Your turn" prompt.
 *
 * Extracted 1:1 from design-reference/source/HeroCombo.html (desktop) and
 * HeroComboMobile.html (phone). Use this module as-is: import the constants
 * and drive the UI from `stateAt()`. Do NOT re-implement the timings.
 *
 * How it works
 * ------------
 * The design advances through discrete states with timers. Here the same
 * sequence is expressed as a list of timestamped events per loop, so the UI
 * can be driven by ONE pausable clock:
 *
 *   const s = stateAt(exampleIndex, elapsedMsInThisLoop);
 *   const v = deriveVisuals(s, templates);  // everything the UI needs
 *
 * React renders `v`. The smooth in-between motion is done by CSS transitions /
 * GSAP tweens with the durations and easings exported below, started whenever
 * a value changes — exactly like the design.
 *
 * When the loop for example k ends (elapsed >= loopDuration(k)), start the
 * loop for example (k + 1) % 4 at elapsed 0. Pause the clock when both
 * sections are off-screen or the tab is hidden; resume where it stopped.
 */

/* ------------------------------------------------------------------ */
/* 1. Constants                                                        */
/* ------------------------------------------------------------------ */

/** How long the hero stays on each step before moving to the next (ms). Index = step. */
export const HOLDS_MS = [1400, 480, 1400, 480, 1400, 480, 1400, 620, 900, 900] as const;
// Note: the design file also lists 1100 for step 10, but it is never used in the
// automatic loop — typing starts the moment step 10 begins (see buildLoopEvents).

/** Packet travel time INTO each step (s). Index = step. Step 0 is a jump (no transition). */
export const PACKET_MOVE_S = [0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.45, 0.8, 0.85, 1.05] as const;
export const PACKET_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

/** Packet centre per step, on the design frames. */
export const PACKET_POINTS = {
  /** 1440-wide desktop stage (scale uniformly with the viewport, see DESIGN_SPEC §3). */
  desktop: [[110, 198], [110, 332], [260, 332], [260, 466], [410, 466], [410, 600], [560, 600], [560, 700], [1400, 700], [1400, 1299], [86, 1299]],
  /** 390-wide phone stage (scale uniformly with the screen width, see DESIGN_SPEC §8). */
  mobile: [[22, 155], [22, 233], [50, 233], [50, 311], [78, 311], [78, 389], [106, 389], [106, 446], [382, 446], [382, 1283], [26, 1283]],
} as const;

/** Packet look. */
export const PACKET = {
  desktop: { size: 10, glowSpread: 4 },
  mobile: { size: 8, glowSpread: 3 },
} as const;

/** CSS transitions used by the design (apply them; never animate faster/slower). */
export const TRANSITIONS = {
  lineFill: 'color 0.5s, -webkit-text-stroke-color 0.5s',   // headline outline → solid
  wire: 'stroke 0.4s',                                       // seg0..segOut
  rail: 'stroke 0.5s',                                       // rail down to the prompt
  node: 'fill 0.3s, stroke 0.3s',
  underline: 'border-color 0.6s',
  chevron: 'color 0.4s',
  promptBox: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s, box-shadow 0.3s',
  connector: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  connectorPacket: 'opacity 0.2s',
} as const;

/** Prompt (section 02) timings, ms. */
export const PROMPT_MS = {
  /** Delay before typing character i (i = current text length): 34 + (i % 5) * 9 */
  typeChar: (currentLength: number) => 34 + (currentLength % 5) * 9,
  afterTyped: 420,
  revealEach: 240,
  beforeRun: 200,
  runStep: 520,
  holdResult: 2200,
  /** Every tick removes 2 characters. */
  eraseTick: 12,
  afterErased: 200,
  /** When the VISITOR triggers a build (Enter, Generate, chip): */
  user: { revealEach: 200, beforeRun: 160, runStep: 480, settle: 600 },
  /** Hero rest between runs once the visitor has taken over the prompt. */
  heroRestAfterTakeover: 2400,
  /** If the visitor takes over while the hero rests at the prompt (step 10). */
  heroRestartAfterTakeoverAtPrompt: 1600,
} as const;

export type NodeKind = 'Trigger' | 'Schedule' | 'Model' | 'Code' | 'Tool' | 'Human';
export interface Template { chip: string; prompt: string; nodes: [NodeKind, string][] }

export const TEMPLATES: Template[] = [
  { chip: 'Invoices → ledger', prompt: 'Reconcile invoices from Gmail into our accounting tool',
    nodes: [['Trigger', 'Invoice email arrives'], ['Model', 'Extract the fields'], ['Code', 'Match to purchase orders'], ['Human', 'Check if unsure'], ['Tool', 'Post to the ledger']] },
  { chip: 'Refund emails', prompt: 'Answer refund emails and escalate the angry ones',
    nodes: [['Trigger', 'Support inbox'], ['Model', 'Read intent and mood'], ['Tool', 'Look up the order'], ['Model', 'Draft the reply'], ['Human', 'Escalate if upset']] },
  { chip: 'Monday KPI report', prompt: 'Every Monday, send a KPI summary to Slack',
    nodes: [['Schedule', 'Monday 09:00'], ['Tool', 'Pull the metrics'], ['Model', 'Write the summary'], ['Code', 'Sanity-check numbers'], ['Tool', 'Post to #ops']] },
  { chip: 'Lead research', prompt: 'Research new leads and add them to the CRM',
    nodes: [['Trigger', 'New form lead'], ['Tool', 'Search the company'], ['Model', 'Score the fit'], ['Tool', 'Enrich the CRM record'], ['Tool', 'Notify sales']] },
];

export const GENERIC_TEMPLATE: Template = {
  chip: '', prompt: '',
  nodes: [['Trigger', 'When it happens'], ['Model', 'Understand the input'], ['Code', 'Apply your rules'], ['Tool', 'Do the work'], ['Human', 'Approve the result']],
};

/** Keyword matching used when the visitor types their own task. Returns a template index, or -2 for the generic one. */
export function matchTemplate(text: string): number {
  const q = (text || '').toLowerCase();
  if (/invoice|receipt|bill|accounting|ledger|xero|quickbooks/.test(q)) return 0;
  if (/refund|support|ticket|reply|customer|complain|inbox/.test(q)) return 1;
  if (/report|kpi|weekly|monday|summary|metric|dashboard/.test(q)) return 2;
  if (/lead|crm|sales|prospect|hubspot|salesforce/.test(q)) return 3;
  return -2;
}

/** Live-run log rows; a row is visible once `step >= at`. */
export const LOG_ROWS = [
  { at: 0, time: '14:02:11.004', short: '14:02:11.0', step: 'trigger', text: 'request · "Reconcile March invoices"' },
  { at: 2, time: '14:02:11.630', short: '14:02:11.6', step: 'plan', text: '3 steps · 2 tools · 1 check' },
  { at: 4, time: '14:02:13.902', short: '14:02:13.9', step: 'act', text: 'sheets → ledger · 41 rows matched' },
  { at: 6, time: '14:02:19.247', short: '14:02:19.2', step: 'ship', text: 'verified · report sent to #finance' },
  { at: 8, time: '14:02:19.250', short: '14:02:19.3', step: 'done', text: '8.2s · 0 errors · next run: yours ↓' },
] as const;

/* ------------------------------------------------------------------ */
/* 2. State                                                            */
/* ------------------------------------------------------------------ */

export type Phase = 'idle' | 'typing' | 'building' | 'running' | 'erasing' | 'done';

export interface HeroState {
  /** Hero step 0–10. */
  step: number;
  /** True when the packet must jump to its point with NO transition (loop restart). */
  jump: boolean;
  phase: Phase;
  /** Template shown in the prompt: 0–3, -2 = generic, -1 = "upcoming" (show nextTpl as ghosts). */
  tpl: number;
  /** The example that will play next (used while tpl = -1). */
  nextTpl: number;
  typed: string;
  /** How many prompt nodes are revealed (0–5). */
  revealed: number;
  /** Active prompt node during the test run (-1 = none). */
  active: number;
}

interface LoopEvent { t: number; patch: Partial<HeroState> }

const cache = new Map<number, { events: LoopEvent[]; duration: number }>();

/** The exact event list of one automatic loop that plays example k. */
export function buildLoopEvents(k: number): { events: LoopEvent[]; duration: number } {
  const hit = cache.get(k);
  if (hit) return hit;
  const events: LoopEvent[] = [];
  let t = 0;
  // Hero run. At t=0 the state is reset: step 0, packet jumps, prompt shows the
  // upcoming example's boxes as ghosts (tpl -1, revealed 0), text empty.
  events.push({ t, patch: { step: 0, jump: true, phase: 'idle', tpl: -1, nextTpl: k, typed: '', revealed: 0, active: -1 } });
  for (let s = 1; s <= 10; s++) {
    t += HOLDS_MS[s - 1];
    events.push({ t, patch: { step: s, jump: false } });
  }
  // Step 10 begins: typing starts IMMEDIATELY (while the packet is still
  // sliding along the underline for 1.05s).
  const target = TEMPLATES[k].prompt;
  events.push({ t, patch: { tpl: k, phase: 'typing', typed: '', revealed: 0, active: -1 } });
  for (let i = 0; i < target.length; i++) {
    t += PROMPT_MS.typeChar(i);
    events.push({ t, patch: { typed: target.slice(0, i + 1) } });
  }
  t += PROMPT_MS.afterTyped;
  events.push({ t, patch: { phase: 'building', revealed: 0 } });
  for (let r = 1; r <= 5; r++) {
    t += PROMPT_MS.revealEach;
    events.push({ t, patch: { revealed: r } });
  }
  t += PROMPT_MS.beforeRun;
  events.push({ t, patch: { phase: 'running', active: 0 } });
  for (let a = 1; a <= 4; a++) {
    t += PROMPT_MS.runStep;
    events.push({ t, patch: { active: a } });
  }
  t += PROMPT_MS.holdResult;
  events.push({ t, patch: { phase: 'erasing', active: -1 } });
  // Erase 2 chars per tick; boxes fade back to ghosts as the text shrinks:
  // revealed = min(revealed, ceil(lengthBeforeTick / 12)).
  let len = target.length;
  let revealed = 5;
  while (len > 0) {
    t += PROMPT_MS.eraseTick;
    revealed = Math.min(revealed, Math.ceil(len / 12));
    len = Math.max(0, len - 2);
    events.push({ t, patch: { typed: target.slice(0, len), revealed } });
  }
  t += PROMPT_MS.afterErased;
  const result = { events, duration: t };
  cache.set(k, result);
  return result;
}

export function loopDuration(k: number): number {
  return buildLoopEvents(k).duration;
}

/** Full state at `elapsedMs` into the loop for example k (clamped to the loop). */
export function stateAt(k: number, elapsedMs: number): HeroState {
  const { events } = buildLoopEvents(k);
  const s: HeroState = { step: 0, jump: true, phase: 'idle', tpl: -1, nextTpl: k, typed: '', revealed: 0, active: -1 };
  for (const e of events) {
    if (e.t > elapsedMs) break;
    Object.assign(s, e.patch);
  }
  return s;
}

/** Final state used for prefers-reduced-motion and for the `hero-done` freeze. */
export const REDUCED_MOTION_STATE: HeroState = {
  step: 10, jump: true, phase: 'done', tpl: 0, nextTpl: 0, typed: TEMPLATES[0].prompt, revealed: 5, active: -1,
};

/* ------------------------------------------------------------------ */
/* 3. Derived visuals (what each element shows for a given state)      */
/* ------------------------------------------------------------------ */

export type LineStatus = 'queued' | 'running' | 'done';
export type NodeFill = 'pending' | 'running' | 'done';

export function deriveVisuals(s: HeroState, mode: 'auto' | 'user' = 'auto') {
  const { step } = s;
  const lineStatus = (i: number): LineStatus => (2 * i < step ? 'done' : 2 * i === step ? 'running' : 'queued');
  const nodeFill = (i: number): NodeFill => (2 * i < step ? 'done' : 2 * i === step ? 'running' : 'pending');

  // Hero
  const hero = {
    lines: [0, 1, 2, 3].map(lineStatus),               // queued = hollow outline; running/done = solid
    nodes: [0, 1, 2, 3].map(nodeFill),                 // done = ink, running = signal, pending = paper + line-strong stroke
    wireLit: { seg0: step > 0, seg1: step > 2, seg2: step > 4, out: step >= 7, rail: step >= 9 },
    shippedNodeLit: step >= 8,                          // fill + stroke = signal
    packetIndex: Math.min(step, 10),
    packetJump: s.jump,
    logRows: LOG_ROWS.filter((r) => r.at <= step),      // newest row highlighted
    panelLabel: step >= 8 ? 'complete · 8.2s' : `step ${Math.floor(step / 2) + 1} / 4`,
    panelLabelMobile: step >= 8 ? 'done · 8.2s' : `step ${Math.floor(step / 2) + 1} / 4`,
    /** Phones show only the last 3 log rows. */
    logRowsMobile: LOG_ROWS.filter((r) => r.at <= step).slice(-3),
  };

  // Prompt
  const tplIdx = s.tpl;
  const template = tplIdx >= 0 ? TEMPLATES[tplIdx] : tplIdx === -2 ? GENERIC_TEMPLATE : TEMPLATES[s.nextTpl];
  const phase = s.phase;
  const nodes = template.nodes.map(([kind, title], i) => {
    const shown = i < s.revealed;
    const isActive = i === s.active;
    const isDone = s.active > i || phase === 'done';
    return {
      kind, title, num: i + 1,
      shown,                                            // hidden = opacity 0.12 + translateY(10px) (a faint "ghost")
      border: isActive ? 'active' : isDone && shown ? 'done' : 'idle',   // active: 1.5px signal + 4px signal-soft ring; done: 1px ink; idle: 1px line-strong
      dashed: kind === 'Human' && !isActive,
      markActive: isActive,
      connectorIn: i > 0 ? { drawn: i > 0 && i < s.revealed, packet: s.active === i } : null,
    };
  });
  const models = template.nodes.filter((n) => n[0] === 'Model').length;
  const humans = template.nodes.filter((n) => n[0] === 'Human').length;
  const status =
    phase === 'typing' ? 'Listening' :
    phase === 'building' ? `Designing the system · ${Math.min(s.revealed, 5)} / 5` :
    phase === 'running' ? `Test run · step ${s.active + 1} / 5` :
    phase === 'done' ? 'Ready to build' :
    phase === 'erasing' ? 'Next example' : 'Waiting for your task';
  const statusMobile =
    phase === 'typing' ? 'Listening' :
    phase === 'building' ? `Designing · ${Math.min(s.revealed, 5)} / 5` :
    phase === 'running' ? `Test run · ${s.active + 1} / 5` :
    phase === 'done' ? 'Ready to build' :
    phase === 'erasing' ? 'Next example' : 'Waiting for your task';
  const empty = phase === 'idle' && s.revealed === 0;
  const summary = empty
    ? 'The system appears here'
    : `5 steps · ${models} ${models === 1 ? 'model' : 'models'} · ${humans} ${humans === 1 ? 'human check' : 'human checks'}${tplIdx === -2 ? ' · drafted from your words' : ''}`;
  const summaryMobile = empty ? '—' : `5 steps · ${humans} ${humans === 1 ? 'human check' : 'human checks'}`;
  const lit = step >= 10 || phase === 'typing' || phase === 'building' || phase === 'running' || mode === 'user';

  const prompt = {
    typed: s.typed,
    underlineLit: lit,                                  // border-bottom: line-strong → ink
    chevronLit: lit,                                    // muted → signal
    selectedChip: tplIdx,                               // the chip of the playing/chosen example looks selected
    status, statusMobile, summary, summaryMobile, nodes,
  };

  return { hero, prompt };
}
