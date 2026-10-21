import { describe, expect, it } from "vitest";
import { FALLBACK, PRICE, REPLAYS, pickReplay, type ReplayContent, type Step } from "@/lib/agent/replay-script";
import { replayContent } from "@/lib/agent/replay-content";

/** A made-up site: every fact in the answers must come from here, never from the answer text. */
const C: ReplayContent = {
  name: "Ada",
  city: "Skopje",
  timezone: "Europe/Skopje",
  summary: "I build agents.",
  availability: "Booked until June",
  about: { lead: "I'm Ada. I build agents.", bio: ["Ada started with Python in 2024.", "Ada likes React and TypeScript."] },
  projects: [
    { slug: "a", runId: "001", title: "Alpha", outcome: "Alpha's outcome", featured: false },
    { slug: "b", runId: "002", title: "Beta", outcome: "Beta's outcome", featured: true },
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
const answer = (q: string, c = C) => text(pickReplay(q).steps(c, q));

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
    const other: ReplayContent = { ...C, name: "Zed", city: "Oslo", availability: "Available", summary: "S.", projects: [{ slug: "z", runId: "009", title: "Zeta", outcome: "Zeta's outcome", featured: true }], toolbox: [{ category: "X", tools: ["Y"] }] };
    for (const r of REPLAYS) {
      const a = text(r.steps(C));
      const b = text(r.steps(other));
      if (["best-project", "tools", "availability", "location", "what-you-build", "your-system"].includes(r.id)) expect(a, r.id).not.toBe(b);
    }
  });
});

describe("keyword matching uses word boundaries, not raw substrings", () => {
  it("'highlights' doesn't misfire into the theme switch (the substring 'light')", () => {
    expect(pickReplay("what are the highlights of your work?").id).not.toBe("theme");
  });
  it("'separate' and 'generate' don't misfire into price (the substring 'rate')", () => {
    expect(pickReplay("can we keep these two tasks separate?").id).not.toBe("price");
    expect(pickReplay("could you generate a short report?").id).not.toBe("price");
  });
  it("'outreach' alone doesn't misfire into availability (the substring 'reach') — it answers about the real project instead", () => {
    expect(pickReplay("tell me about your outreach strategy").id).not.toBe("availability");
    expect(pickReplay("tell me about your outreach strategy").id).toBe("project-cold-outreach");
  });
  it("'startup' doesn't misfire into availability (the substring 'start')", () => {
    expect(pickReplay("is this a startup?").id).not.toBe("availability");
  });
  it("whole-word triggers still work", () => {
    expect(pickReplay("what are your highlights, no really the light ones").id).toBe("theme"); // "light" as its own word still switches the theme
    expect(pickReplay("when could you start?").id).toBe("availability");
    expect(pickReplay("can I book a call?").id).toBe("availability");
  });
});

describe("canned answers for named projects, 'who is', and skills (real content)", () => {
  const real = replayContent("dark");

  it("named real projects each get their own answer", () => {
    expect(pickReplay("tell me about concord").id).toBe("project-concord");
    expect(answer("tell me about concord", real)).toContain("Concord");
    expect(pickReplay("what about the world cup predictor?").id).toBe("project-worldcup");
    expect(answer("what about the world cup predictor?", real)).toContain("World Cup 2026 predictor");
    expect(pickReplay("tell me about the cold outreach agent").id).toBe("project-cold-outreach");
    expect(answer("tell me about the cold outreach agent", real)).toContain("Cold outreach agent");
    expect(pickReplay("what is geolumen?").id).toBe("project-geolumen");
    expect(answer("what is geolumen?", real)).toContain("GeoLumen");
  });

  it("'who is moiz' answers from the real bio, not a guess", () => {
    expect(pickReplay("who is moiz?").id).toBe("who-is-moiz");
    const a = answer("who is moiz?", real);
    expect(a).toContain("Tetovo");
  });

  it("skills questions answer from the real toolbox and bio only", () => {
    expect(pickReplay("does he know Python?").id).toBe("skills");
    expect(answer("does he know Python?", real)).toContain("Python is in the toolbox");
    const reactAnswer = answer("does he know React?", real);
    expect(reactAnswer).not.toContain("I don't see React");
    expect(reactAnswer).toMatch(/React/);
    expect(answer("do you know Photoshop?", real)).toContain("I don't see Photoshop");
  });
});
