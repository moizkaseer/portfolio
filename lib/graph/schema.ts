import { z } from "zod";

export const NodeKindSchema = z.enum(["Trigger", "Schedule", "Model", "Code", "Tool", "Human"]);

/** content/projects/<slug>/graph.json — one source for the mini trace, the run report diagram and the agent. */
export const GraphSchema = z
  .object({
    nodes: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          kind: NodeKindSchema,
          /** shorter label for the phone mini trace */
          short: z.string().optional(),
          /** the mono line under the label in the run report diagram (e.g. "[mail provider] · webhook") */
          detail: z.string().optional(),
        }),
      )
      .min(2),
    /** [from, to] or [from, to, label] — a label marks a conditional branch (e.g. "confidence < 0.9") */
    edges: z.array(z.union([z.tuple([z.string(), z.string()]), z.tuple([z.string(), z.string(), z.string()])])),
  })
  .superRefine((g, ctx) => {
    const ids = new Set(g.nodes.map((n) => n.id));
    if (ids.size !== g.nodes.length) ctx.addIssue({ code: "custom", message: "duplicate node id" });
    for (const [a, b] of g.edges) if (!ids.has(a) || !ids.has(b)) ctx.addIssue({ code: "custom", message: `edge ${a}→${b} references a missing node` });
  });

export type Graph = z.infer<typeof GraphSchema>;
