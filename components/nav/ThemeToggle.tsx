"use client";

import { useSyncExternalStore } from "react";
import { getTheme, setTheme, type Theme } from "@/lib/theme";

function subscribe(onChange: () => void) {
  window.addEventListener("themechange", onChange);
  return () => window.removeEventListener("themechange", onChange);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "dark");
}

/** Half-filled circle + "Night shift" / "Day shift" (Main.html nav). Shows the current theme. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={className}
      data-theme-toggle
    >
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
        <circle cx="6" cy="6" r="5" fill="none" stroke="var(--ink)" />
        <path d="M6 1 A5 5 0 0 1 6 11 Z" fill="var(--ink)" />
      </svg>
      {theme === "dark" ? "Night" : "Day"} shift
      <span className="sr-only"> — switch to {next === "dark" ? "night" : "day"} shift</span>
    </button>
  );
}
