import { z } from "zod";

/** The smart engine's output: the same 5-node shape as the templates (brief C2). */
export const KINDS = ["Trigger", "Schedule", "Model", "Code", "Tool", "Human"] as const;
export const SystemSchema = z.object({
  nodes: z
    .array(z.object({ kind: z.enum(KINDS), title: z.string().trim().min(2).max(40) }))
    .length(5),
});
export type SmartSystem = z.infer<typeof SystemSchema>;
