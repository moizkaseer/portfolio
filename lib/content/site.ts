import { z } from "zod";
import raw from "@/content/site.json";

const SiteSchema = z.object({
  name: z.string().min(1),
  positioning: z.string(),
  /** the hero's sub-line; also what the agent says about the work */
  summary: z.string(),
  city: z.string(),
  /** IANA zone, e.g. "Europe/Skopje". null until the owner provides it (clock falls back to UTC). */
  timezone: z.string().nullable(),
  availability: z.object({
    status: z.enum(["available", "booked"]),
    label: z.string(),
  }),
  email: z.string(),
  domain: z.string(),
  bookingUrl: z.string().url().nullable(),
  socials: z.array(z.object({ label: z.string(), url: z.string().url().nullable() })),
  heroStats: z.array(z.object({ label: z.string(), value: z.string() })).length(2),
});

export type Site = z.infer<typeof SiteSchema>;

export const site: Site = SiteSchema.parse(raw);
