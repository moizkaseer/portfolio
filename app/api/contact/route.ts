import { Resend } from "resend";
import { ContactSchema } from "@/lib/contact-schema";
import { clientIp, createLimiter } from "@/lib/server/rate-limit";
import { site } from "@/lib/content/site";

const limit = createLimiter("contact", 5, 60 * 60); // 5 submissions per IP per hour

/** POST /api/contact — server-side validation, honeypot, per-IP rate limit, delivery via Resend. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request." }, { status: 400 });

  // honeypot: pretend it worked, send nothing
  if (typeof body.company === "string" && body.company.length > 0) return Response.json({ ok: true });

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return Response.json({ error: "Please check the form.", fields }, { status: 422 });
  }

  const { success } = await limit(clientIp(request.headers));
  if (!success) return Response.json({ error: "Too many messages from here — try again in an hour, or email me directly." }, { status: 429 });

  const { task, where, email, system } = parsed.data;
  const text = [`What should be automated?\n${task}`, `Where does it happen today?\n${where || "—"}`, `Email: ${email}`, system ? `Generated system (JSON):\n${system}` : ""]
    .filter(Boolean)
    .join("\n\n");

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!key || !to) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[contact] RESEND_API_KEY / CONTACT_TO_EMAIL not set — message not sent (dev):\n" + text);
      return Response.json({ ok: true, dev: true });
    }
    return Response.json({ error: `Email delivery isn't set up yet — please write to ${site.email}.` }, { status: 503 });
  }

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.CONTACT_FROM_EMAIL ?? "Portfolio <onboarding@resend.dev>",
    to,
    replyTo: email,
    subject: `New run: ${task.slice(0, 60)}${task.length > 60 ? "…" : ""}`,
    text,
  });
  if (error) return Response.json({ error: `Couldn't send right now — please write to ${site.email}.` }, { status: 502 });
  return Response.json({ ok: true });
}
