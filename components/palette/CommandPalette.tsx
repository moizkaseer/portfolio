"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { site } from "@/lib/content/site";
import { getTheme, setTheme } from "@/lib/theme";
import { scrollToTarget } from "@/lib/motion/SmoothScroll";
import styles from "./CommandPalette.module.css";

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  run: () => void;
}

/**
 * Command palette skeleton (brief §4). Phase 4 adds every project, Phase 5 wires
 * "Ask the agent". Native <dialog>: focus trap, Esc and inert background for free.
 */
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();

  const commands = useMemo<Command[]>(() => {
    const go = (hash: string) => () => {
      if (window.location.pathname === "/") scrollToTarget(hash);
      else router.push(`/${hash}`);
    };
    return [
      { id: "your-turn", group: "Go to", label: "Your turn — what should run itself?", run: go("#your-turn") },
      { id: "work", group: "Go to", label: "Selected runs", run: go("#work") },
      { id: "agent", group: "Go to", label: "Talk to my agent", run: go("#agent") },
      { id: "contact", group: "Go to", label: "Contact", run: go("#contact") },
      {
        id: "theme",
        group: "Actions",
        label: "Toggle theme",
        hint: "Night / Day shift",
        run: () => setTheme(getTheme() === "dark" ? "light" : "dark"),
      },
      {
        id: "email",
        group: "Actions",
        label: "Copy email",
        hint: site.email,
        run: () => {
          navigator.clipboard?.writeText(site.email).catch(() => {});
        },
      },
      { id: "agent-ask", group: "Actions", label: "Ask the agent", hint: "coming soon", disabled: true, run: () => {} },
    ];
  }, [router]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => `${c.group} ${c.label} ${c.hint ?? ""}`.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      setQuery("");
      setActive(0);
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  const runAt = (i: number) => {
    const cmd = results[i];
    if (!cmd || cmd.disabled) return;
    onClose();
    cmd.run();
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label="Command palette"
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && onClose()}
    >
      <div className={styles.panel}>
        <div className={styles.head}>
          <span aria-hidden="true" className={styles.prompt}>
            ›
          </span>
          <input
            autoFocus
            className={styles.input}
            placeholder="Type a command…"
            value={query}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runAt(active);
              }
            }}
          />
          <kbd className={styles.kbd}>Esc</kbd>
        </div>

        <ul id={listId} role="listbox" className={styles.list}>
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${c.id}`}
              role="option"
              aria-selected={i === active}
              aria-disabled={c.disabled || undefined}
              className={styles.item}
              onMouseEnter={() => setActive(i)}
              onClick={() => runAt(i)}
            >
              <span className={styles.group}>{c.group}</span>
              <span className={styles.label}>{c.label}</span>
              {c.hint && <span className={styles.hint}>{c.hint}</span>}
            </li>
          ))}
          {results.length === 0 && <li className={styles.empty}>No command matches “{query}”</li>}
        </ul>
      </div>
    </dialog>
  );
}
