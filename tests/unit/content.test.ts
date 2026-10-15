import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { GraphSchema } from "@/lib/graph/schema";
import { mainPath } from "@/lib/graph/layout";

const DIR = path.join(__dirname, "..", "..", "content", "projects");
const slugs = fs.readdirSync(DIR).filter((d) => fs.statSync(path.join(DIR, d)).isDirectory());

describe("project content", () => {
  it("has the four placeholder projects from the design", () => {
    expect(slugs.sort()).toEqual(["invoice-extraction-pipeline", "lead-research-agent", "support-inbox-agent", "weekly-ops-report"]);
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
    const g = GraphSchema.parse(JSON.parse(fs.readFileSync(path.join(DIR, "invoice-extraction-pipeline", "graph.json"), "utf8")));
    expect(mainPath(g).map((n) => n.short)).toEqual(["trigger", "extract", "validate", "ledger"]);
    expect(mainPath(g).map((n) => n.id)).toEqual(["trigger", "extract", "validate", "post-to-ledger"]);
  });

  it("keeps an approval that sits in the main line", () => {
    const g = GraphSchema.parse(JSON.parse(fs.readFileSync(path.join(DIR, "support-inbox-agent", "graph.json"), "utf8")));
    expect(mainPath(g).map((n) => n.id)).toEqual(["trigger", "classify", "lookup", "draft", "approve", "send"]);
  });
});
