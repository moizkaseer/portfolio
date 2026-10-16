"use client";

import { useEffect, useState } from "react";
import styles from "./GridOverlay.module.css";

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/** The 12-column grid, toggled with Shift+G (dev aid + easter egg). */
export function GridOverlay() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.code === "KeyG" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        setOn((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!on) return null;
  return (
    <div aria-hidden="true" className={styles.overlay}>
      <div className={styles.grid}>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  );
}
