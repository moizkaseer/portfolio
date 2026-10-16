import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { GraphSchema } from "@/lib/graph/schema";
import { mainPath } from "@/lib/graph/layout";

const DIR = path.join(__dirname, "..", "..", "content", "projects");
const FIXTURES = path.join(__dirname, "fixtures");
const slugs = fs.readdirSync(DIR).filter((d) => fs.statSync(path.join(DIR, d)).isDirectory());

describe("project content", () => {
  it("has the owner's three projects", () => {
    expect(slugs.sort()).toEqual(["cold-outreach-agent", "concord", "worldcup-2026-prediction"]);
  });

  for (const slug of slugs) {
    it(`${slug}: valid frontmatter and graph.json`, () => {
      const { data } = matter(fs.readFileSync(path.join(DIR, slug, "index.mdx"), "utf8"));
      expect(data.runId).toMatch(/^\d{3}$/);
      const g = GraphSchema.parse(JSON.parse(fs.readFileSync(path.join(DIR, slug, "graph.json"), "utf8")));
      expect(mainPath(g).length).toBeGreaterThanOrEqual(3);
    });
  }

  it("mini trace of the invoice pipeline matches the design (side branch to the human skipped)", () => {
    const g = GraphSchema.parse(JSON.parse(fs.readFileSync(path.join(FIXTURES, "invoice-graph.json"), "utf8")));
    expect(mainPath(g).map((n) => n.short)).toEqual(["trigger", "extract", "validate", "ledger"]);
    expect(mainPath(g).map((n) => n.id)).toEqual(["trigger", "extract", "validate", "post-to-ledger"]);
  });

  it("keeps an approval that sits in the main line", () => {
    const g = GraphSchema.parse(JSON.parse(fs.readFileSync(path.join(FIXTURES, "support-graph.json"), "utf8")));
    expect(mainPath(g).map((n) => n.id)).toEqual(["trigger", "classify", "lookup", "draft", "approve", "send"]);
  });
});

describe("run report diagram layout", () => {
  it("lays out the invoice pipeline like RunReport.html", async () => {
    const { diagramLayout } = await import("@/lib/graph/diagram-layout");
    const g = GraphSchema.parse(JSON.parse(fs.readFileSync(path.join(FIXTURES, "invoice-graph.json"), "utf8")));
    const l = diagramLayout(g);
    expect(l.columns).toBe(7);
    expect(l.nodes.map((n) => [n.id, n.num, n.col, n.row])).toEqual([
      ["trigger", 1, 1, 1],
      ["extract", 2, 3, 1],
      ["validate", 3, 5, 1],
      ["review", 4, 5, 3],
      ["post-to-ledger", 5, 7, 1],
    ]);
    expect(l.branches).toEqual([{ col: 5, from: "validate", to: "review", label: "confidence < 0.9" }]);
    expect(l.returns).toEqual([{ fromCol: 5, toCol: 7, from: "review", to: "post-to-ledger" }]);
    expect(l.edgeCount).toBe(5);
    expect(l.description).toBe(
      "Workflow: Invoice email arrives → Extract fields → Validate totals → Post to ledger; when confidence < 0.9, Validate totals → Review & approve → Post to ledger.",
    );
  });
});

describe("generated content index", () => {
  it("lib/content/slugs.generated.json lists exactly the projects on disk (run `node scripts/gen-content-index.mjs`)", async () => {
    const generated = (await import("@/lib/content/slugs.generated.json")).default;
    expect(generated).toEqual([...slugs].sort());
  });

  it("every trace has a note (the replay sentence must be true for the trace)", () => {
    for (const slug of slugs) {
      const p = path.join(DIR, slug, "trace.json");
      if (fs.existsSync(p)) expect(JSON.parse(fs.readFileSync(p, "utf8")).note).toBeTruthy();
    }
  });
});

describe("projects index for browser code", () => {
  it("lib/content/projects.generated.json matches the projects' frontmatter", async () => {
    const generated = (await import("@/lib/content/projects.generated.json")).default;
    for (const g of generated) {
      const { data } = matter(fs.readFileSync(path.join(DIR, g.slug, "index.mdx"), "utf8"));
      expect(g).toMatchObject({ runId: data.runId, title: data.title, outcome: data.outcome, category: data.category, featured: data.featured === true });
    }
    expect(generated.filter((g) => g.featured)).toHaveLength(1);
  });
});
