"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PREFILL_EVENT, type ContactPrefill } from "@/lib/prompt-store";
import { MiniTrace } from "./MiniTrace";
import styles from "./Contact.module.css";

type Status = "idle" | "sending" | "sent" | "error";
type Errors = Partial<Record<"task" | "where" | "email", string>>;

/** Mirrors lib/contact-schema.ts (the server validates again) without shipping zod to the browser. */
function validate(task: string, email: string): Errors {
  const e: Errors = {};
  if (task.trim().length < 10) e.task = "Tell me a bit more — at least a sentence.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "That email doesn't look right.";
  return e;
}

/** The contact form as a workflow trigger: three steps, ▶ Run, then a mini trace. */
export function ContactForm({ ownerName }: { ownerName: string }) {
  const id = useId();
  const [task, setTask] = useState("");
  const [where, setWhere] = useState("");
  const [email, setEmail] = useState("");
  const [system, setSystem] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");
  const taskRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const p = (e as CustomEvent<ContactPrefill>).detail;
      setTask(p.summary);
      setSystem(p.system ? JSON.stringify(p.system) : "");
      setStatus("idle");
    };
    window.addEventListener(PREFILL_EVENT, on);
    return () => window.removeEventListener(PREFILL_EVENT, on);
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const found = validate(task, email);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`${id}-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, where, email, system: system || undefined, company: form.get("company") ?? "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setMessage(data.error ?? "Something went wrong — please email me directly.");
        setStatus("error");
        return;
      }
      setStatus("sent");
      setMessage("Received. I'll reply by email.");
    } catch {
      setMessage("Couldn't reach the server — please email me directly.");
      setStatus("error");
    }
  };

  const fields = [
    { key: "task", n: "01", kind: "Trigger", label: "What should be automated?" },
    { key: "where", n: "02", kind: "Tool", label: "Where does it happen today?" },
    { key: "email", n: "03", kind: "Human", label: "Email" },
  ] as const;

  return (
    <form className={styles.form} onSubmit={submit} noValidate aria-describedby={`${id}-status`}>
      {fields.map((f) => {
        const err = errors[f.key];
        const fid = `${id}-${f.key}`;
        return (
          <div key={f.key} className={styles.field} data-invalid={!!err}>
            <label htmlFor={fid} className={styles.label}>
              <span className={styles.kind}>
                <span aria-hidden="true" className={styles.mark} data-kind={f.kind} />
                {f.n}
              </span>
              {f.label}
            </label>
            {f.key === "task" ? (
              <textarea
                ref={taskRef}
                id={fid}
                name="task"
                rows={3}
                maxLength={2000}
                className={styles.textarea}
                placeholder="e.g. We copy invoices from Gmail into Xero every Friday"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                aria-invalid={!!err}
                aria-describedby={err ? `${fid}-err` : undefined}
              />
            ) : (
              <input
                id={fid}
                name={f.key}
                type={f.key === "email" ? "email" : "text"}
                autoComplete={f.key === "email" ? "email" : "off"}
                maxLength={f.key === "email" ? 320 : 500}
                className={styles.input}
                placeholder={f.key === "email" ? "you@company.com" : "e.g. Gmail, a shared sheet, our ERP"}
                value={f.key === "email" ? email : where}
                onChange={(e) => (f.key === "email" ? setEmail(e.target.value) : setWhere(e.target.value))}
                aria-invalid={!!err}
                aria-describedby={err ? `${fid}-err` : undefined}
              />
            )}
            {err && (
              <span id={`${fid}-err`} className={styles.error}>
                {err}
              </span>
            )}
          </div>
        );
      })}

      {/* honeypot — hidden from people and assistive tech */}
      <div aria-hidden="true" className={styles.honeypot}>
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="system" value={system} />
      {system && <p className={styles.attached}>The system you sketched above is attached.</p>}

      <div className={styles.submitRow}>
        <button type="submit" className={styles.run} disabled={status === "sending"}>
          <span aria-hidden="true" className={styles.triangle} />
          {status === "sending" ? "Running…" : "Run"}
        </button>
        {status === "sent" && (
          <MiniTrace
            nodes={[
              { id: "received", label: "received", short: "received", kind: "Trigger" },
              { id: "parsed", label: "parsed", short: "parsed", kind: "Model" },
              { id: `queued for ${ownerName}`, label: `queued for ${ownerName}`, short: `queued for ${ownerName}`, kind: "Human" },
            ]}
            play
          />
        )}
      </div>
      <p id={`${id}-status`} role="status" aria-live="polite" className={status === "error" ? styles.statusError : styles.status}>
        {message}
      </p>
    </form>
  );
}
