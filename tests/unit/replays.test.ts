import { describe, expect, it } from "vitest";
import { FALLBACK, PRICE, REPLAYS, pickReplay, type ReplayContent, type Step } from "@/lib/agent/replay-script";

/** A made-up site: every fact in the answers must come from here, never from the answer text. */
const C: ReplayContent = {
  name: "Ada",
  city: "Skopje",
  timezone: "Europe/Skopje",
  summary: "I build agents.",
  availability: "Booked until June",
  projects: [
    { slug: "a", runId: "001", title: "Alpha", featured: false },
    { slug: "b", runId: "002", title: "Beta", featured: true },
  ],
  toolbox: [
    { category: "Models", tools: ["M1", "M2"] },
    { category: "Data", tools: ["D1"] },
  ],
  process: { plan: "Plan text.", verify: "Verify text." },
  prompt: { task: "Chase invoices", nodes: [{ kind: "Trigger", title: "Email" }, { kind: "Human", title: "Check" }] },
  theme: "light",
};

const text = (steps: Step[]) => steps.filter((s) => s.kind === "text").map((s) => (s as { text: string }).text).join(" ");
const answer = (q: string, c = C) => text(pickReplay(q).steps(c));

describe("demo replay answers come from the content files", () => {
  it("best project = the featured run", () => {
    const steps = pickReplay("show me your best project").steps(C);
    expect(text(steps)).toBe("This is RUN #002, Beta. I have highlighted it on the page and I am opening the full run report next.");
    expect(steps.some((s) => s.kind === "ui" && s.tool === "ui_open_project" && s.input.slug === "b")).toBe(true);
  });
  it("availability, location, summary, tools, process", () => {
    expect(answer("are you available?")).toContain("Booked until June.");
    expect(answer("where are you based?")).toBe("Ada is based in Skopje (Europe/Skopje time).");
    expect(answer("what do you build?")).toBe("I build agents. The runs on this site: Alpha and Beta.");
    expect(answer("what tools do you use?")).toBe("Models: M1 and M2. Data: D1. Hover a tool to see which runs used it.");
    expect(answer("how do you make agents reliable?")).toBe("Plan text. Verify text.");
  });
  it("the visitor's system (get_prompt_state)", () => {
    expect(answer("could you really build this?")).toContain('You described: "Chase invoices". The sketch has 2 steps — Email → Check — with 0 model steps and 1 human check.');
    expect(answer("could you build this?", { ...C, prompt: null })).toContain('Describe a task in "What should run itself?" first');
  });
  it("prices are never guessed; unknown questions get the honest fallback", () => {
    expect(pickReplay("how much does it cost?")).toBe(PRICE);
    expect(answer("how much does it cost?")).toBe("I don't know — ask Ada directly through the contact form.");
    expect(pickReplay("tell me a joke")).toBe(FALLBACK);
  });
  it("no answer hard-codes a fact: changing the content changes every answer that states one", () => {
    const other: ReplayContent = { ...C, name: "Zed", city: "Oslo", availability: "Available", summary: "S.", projects: [{ slug: "z", runId: "009", title: "Zeta", featured: true }], toolbox: [{ category: "X", tools: ["Y"] }] };
    for (const r of REPLAYS) {
      const a = text(r.steps(C));
      const b = text(r.steps(other));
      if (["best-project", "tools", "availability", "location", "what-you-build", "your-system"].includes(r.id)) expect(a, r.id).not.toBe(b);
    }
  });
});
