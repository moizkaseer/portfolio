import "server-only";
import { getNextProject, getProject, getProjects, type ProjectMeta } from "@/lib/content/projects";
import { site } from "@/lib/content/site";
import { mainPath } from "@/lib/graph/layout";
import toolbox from "@/content/toolbox.json";
import process from "@/content/process.json";
import { blockText } from "./font";

/**
 * The curl version (brief C4): the portfolio as plain text, generated from the same content
 * files as the site. Max 80 columns; ANSI 256-colour 202 for the signal accent and bold for
 * headings — or none with ?nocolor.
 */
export const WIDTH = 80;
const ESC = "\x1b[";

export function styler(color: boolean) {
  const wrap = (code: string) => (s: string) => (color ? `${ESC}${code}m${s}${ESC}0m` : s);
  return { accent: wrap("38;5;202"), bold: wrap("1"), dim: wrap("2"), accentBold: wrap("1;38;5;202") };
}

/** Visible width (ANSI codes don't count). */
export const visible = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "").length;

/** Word-wraps plain text to `width`, prefixing every line with `indent`. */
export function wrap(text: string, indent = "", width = WIDTH): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (indent.length + next.length > width && line) {
      lines.push(indent + line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(indent + line);
  // a single word longer than the line is cut rather than overflowing
  return lines.map((l) => (l.length > width ? l.slice(0, width - 1) + "…" : l));
}

const rule = (label: string, s: ReturnType<typeof styler>) => {
  const head = ` ${label.toUpperCase()} `;
  return `${s.dim("──")}${s.bold(head)}${s.dim("─".repeat(Math.max(0, WIDTH - 2 - head.length)))}`;
};

const host = () => site.domain;

function header(s: ReturnType<typeof styler>): string[] {
  const block = blockText(site.name, WIDTH);
  const out = block ? block.map((l) => s.accent(l)) : [s.accentBold(site.name)];
  const live = site.availability.status === "available";
  out.push("", `${s.bold(site.positioning)}  ·  ${site.city}  ·  ${live ? s.accent("●") : "○"} ${site.availability.label}`);
  out.push("", ...wrap(site.summary));
  return out;
}

const status = (p: ProjectMeta) => (p.status === "in-production" ? `● In production` : "○ Handed over");

export function renderHome(color: boolean): string {
  const s = styler(color);
  const projects = getProjects();
  const out: string[] = ["", ...header(s), "", rule("Selected runs", s), ""];
  for (const p of projects) {
    const id = `RUN #${p.runId}`;
    const right = `${status(p)} · ${p.year}`;
    const title = p.title.length > WIDTH - id.length - right.length - 6 ? p.title.slice(0, WIDTH - id.length - right.length - 7) + "…" : p.title;
    const gap = Math.max(2, WIDTH - id.length - 2 - title.length - right.length);
    out.push(`${s.accent(id)}  ${s.bold(title)}${" ".repeat(gap)}${right.replace("●", s.accent("●"))}`);
    out.push(...wrap(p.outcome, "          "));
    out.push(...wrap(`→ curl ${host()}/work/${p.slug}`, "          ").map(s.dim), "");
  }
  out.push(rule("How I work", s), "");
  process.steps.forEach((st, i) => {
    out.push(`${s.accent(String(i + 1).padStart(2, "0"))}  ${s.bold(st.title)}`);
    out.push(...wrap(st.text, "    "), "");
  });
  out.push(rule("Toolbox", s), "");
  for (const g of toolbox.groups) {
    const label = g.category.padEnd(15);
    out.push(...wrap(g.tools.join(", "), " ".repeat(15)).map((l, i) => (i === 0 ? s.bold(label) + l.slice(15) : l)));
  }
  out.push("", rule("Contact", s), "");
  out.push(`${s.bold("Email".padEnd(15))}${site.email}`);
  out.push(`${s.bold("Book a call".padEnd(15))}${site.bookingUrl ?? "[booking link]"}`);
  for (const so of site.socials) out.push(`${s.bold("".padEnd(15))}${so.url ?? so.label}`);
  out.push("", ...wrap(`Have work that should run itself? Write to ${site.email}.`));
  out.push("", s.dim(`Try: curl ${host()}/work/<slug>  ·  no colour: add ?nocolor`), "");
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

export function renderRun(slug: string, color: boolean): string | null {
  const p = getProject(slug);
  if (!p) return null;
  const s = styler(color);
  const next = getNextProject(slug);
  const out: string[] = ["", `${s.accent(`RUN #${p.runId}`)}  ·  ${status(p).replace("●", s.accent("●"))}${p.status === "in-production" ? ` since ${p.since}` : ""}  ·  ${p.runsLine}`, ""];
  out.push(...wrap(p.title).map(s.bold), "", ...wrap(p.lead.replace(/\*/g, "")), "");
  for (const [k, v] of [
    ["Client", p.industry],
    ["Role", p.role],
    ["Timeline", p.timeline],
    ["Stack", p.stack.join(" · ")],
  ])
    out.push(...wrap(v, " ".repeat(12)).map((l, i) => (i === 0 ? s.dim(k.padEnd(12)) + l.slice(12) : l)));

  out.push("", rule("01 — The system", s), "");
  const path = mainPath(p.graph);
  path.forEach((n, i) => out.push(...wrap(`${String(i + 1).padStart(2, "0")}  ${n.label} (${n.kind.toLowerCase()})`, "  ").map((l) => (i === 0 ? l : l)), ...(i < path.length - 1 ? [s.accent("  │")] : [])));
  for (const [from, to, when] of p.graph.edges) {
    if (!when) continue;
    const a = p.graph.nodes.find((n) => n.id === from)!;
    const b = p.graph.nodes.find((n) => n.id === to)!;
    out.push("", ...wrap(`branch: when ${when}, ${a.label} → ${b.label} (${b.kind.toLowerCase()})`, "  "));
  }

  let n = 2;
  if (p.trace) {
    out.push("", rule(`0${n++} — Trace replay`, s), "", ...wrap(p.trace.note), "", s.dim(`${p.trace.runId} · ${p.trace.date}`));
    for (const r of p.trace.rows) {
      const head = `${(r.t ?? "—").padEnd(13)} ${r.step.padEnd(9)} `;
      const body = wrap(r.text, " ".repeat(head.length));
      out.push(s.dim(head.slice(0, 13)) + head.slice(13) + body[0].slice(head.length), ...body.slice(1));
    }
  }
  out.push("", rule(`0${n++} — Results`, s), "");
  for (const r of p.results) out.push(`${s.accentBold(`${r.value}${r.unit}`.padEnd(10))}${r.label}`);

  // the MDX body (problem, decisions & tradeoffs, what's next) as plain text
  for (const block of p.body.split(/\n(?=## )/)) {
    const m = block.match(/^## (.+)\n([\s\S]*)$/);
    if (!m) continue;
    out.push("", rule(`0${n++} — ${m[1].trim()}`, s), "");
    for (const para of m[2].trim().split(/\n\s*\n/)) out.push(...wrap(para.replace(/[*_`]/g, "").replace(/\s+/g, " ")), "");
  }
  out.push("", rule("Next run", s), "", `${s.accent(`RUN #${next.runId}`)}  ${s.bold(next.title)}`, s.dim(`→ curl ${host()}/work/${next.slug}`));
  out.push("", s.dim(`← all runs: curl ${host()}`), "");
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}
