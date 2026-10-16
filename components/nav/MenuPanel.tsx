"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { NAV_LINKS } from "./nav-links";
import { NavClock } from "./NavClock";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./MobileMenu.module.css";

/** The phone's full-screen menu (loaded on the first tap of "Menu"). */
export default function MenuPanel({
  open,
  setOpen,
  buttonRef,
  city,
  timezone,
  statusLabel,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  city: string;
  timezone: string | null;
  statusLabel: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // one frame after mounting, so the first open animates too
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(open));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("a, button")?.focus();
    document.documentElement.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      // keep focus inside the menu
      const items = panel.querySelectorAll<HTMLElement>("a, button");
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, setOpen, buttonRef]);

  return (
      <div
        id="mobile-menu"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={styles.panel}
        data-open={shown}
        inert={!shown}
      >
        <div className={styles.top}>
          <span className={styles.label}>Menu</span>
          <button
            type="button"
            className={styles.trigger}
            onClick={() => {
              setOpen(false);
              buttonRef.current?.focus();
            }}
          >
            Close
          </button>
        </div>

        <nav aria-label="Mobile" className={styles.links}>
          {NAV_LINKS.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className={styles.link}
              prefetch={l.built ? undefined : false}
              style={{ transitionDelay: `${60 + i * 60}ms` }}
              onClick={() => setOpen(false)}
            >
              <span className={styles.index}>{l.index}</span>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className={styles.bottom}>
          <span>
            <span className={styles.ink}>Online</span> · {city} <NavClock timezone={timezone} />
          </span>
          <span className={styles.status}>
            <span aria-hidden="true" className="led" />
            {statusLabel}
          </span>
          <ThemeToggle className={styles.trigger} />
        </div>
      </div>
  );
}
