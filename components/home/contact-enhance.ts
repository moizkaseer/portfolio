/**
 * In-place submit for the contact form (loaded on demand by ContactEnhance): client-side
 * checks mirroring lib/contact-schema.ts (the server validates again), field errors, status,
 * and the "received → parsed → queued" trace on success.
 */
type Field = "task" | "where" | "email";

function validate(task: string, email: string): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  if (task.trim().length < 10) e.task = "Tell me a bit more — at least a sentence.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "That email doesn't look right.";
  return e;
}

export function enhanceContactForm(form: HTMLFormElement) {
  if (form.dataset.enhanced) return;
  form.dataset.enhanced = "true";
  form.noValidate = true;
  const status = form.querySelector<HTMLElement>("[role=status]")!;
  const label = form.querySelector<HTMLElement>("[data-run-label]")!;
  const button = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "";

  const showErrors = (errors: Partial<Record<string, string>>) => {
    for (const f of ["task", "where", "email"] as Field[]) {
      const field = form.querySelector<HTMLElement>(`[data-field="${f}"]`)!;
      const control = form.elements.namedItem(f) as HTMLInputElement;
      const err = field.querySelector<HTMLElement>(`#contact-${f}-err`)!;
      const msg = errors[f];
      field.dataset.invalid = String(!!msg);
      control.setAttribute("aria-invalid", String(!!msg));
      if (msg) control.setAttribute("aria-describedby", err.id);
      else control.removeAttribute("aria-describedby");
      err.textContent = msg ?? "";
      err.hidden = !msg;
    }
  };

  const setStatus = (text: string, error = false) => {
    status.textContent = text;
    status.dataset.error = String(error);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errors = validate(value("task"), value("email"));
    showErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) {
      (form.elements.namedItem(first) as HTMLElement).focus();
      return;
    }
    button.disabled = true;
    label.textContent = "Running…";
    label.parentElement!.dataset.label = "Running…";
    setStatus("");
    form.removeAttribute("data-sent");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: value("task"),
          where: value("where"),
          email: value("email"),
          system: value("system") || undefined,
          company: value("company"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showErrors(data.fields ?? {});
        setStatus(data.error ?? "Something went wrong — please email me directly.", true);
        return;
      }
      form.dataset.sent = "true";
      setStatus("Received. I'll reply by email.");
    } catch {
      setStatus("Couldn't reach the server — please email me directly.", true);
    } finally {
      button.disabled = false;
      label.textContent = "Run";
      label.parentElement!.dataset.label = "Run";
    }
  });
}
