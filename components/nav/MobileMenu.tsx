"use client";

import { lazy, Suspense, useRef, useState } from "react";
import styles from "./MobileMenu.module.css";

const MenuPanel = lazy(() => import("./MenuPanel"));

/** Phone "Menu" button; the full-screen menu (MenuPanel) loads on the first tap (brief §4). */
export function MobileMenu({ city, timezone, statusLabel }: { city: string; timezone: string | null; statusLabel: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        Menu
        <span aria-hidden="true" className={styles.bars}>
          <span />
          <span />
        </span>
      </button>

      {mounted && (
        <Suspense fallback={null}>
          <MenuPanel open={open} setOpen={setOpen} buttonRef={buttonRef} city={city} timezone={timezone} statusLabel={statusLabel} />
        </Suspense>
      )}
    </>
  );
}
