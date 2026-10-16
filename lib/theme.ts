export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "mr-theme";

/** Runs in <head> before paint so a stored choice never flashes. Night shift is the default. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`;

export function getTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage unavailable (private mode, blocked); the choice just isn't remembered
  }
  window.dispatchEvent(new CustomEvent<Theme>("themechange", { detail: theme }));
}
