export const NAV_LINKS = [
  { index: "01", label: "Work", href: "/#work", built: true },
  { index: "02", label: "Agent", href: "/#agent", built: true },
  // /about is built in Phase 7; until then it is not prefetched (no 404s in the console).
  { index: "03", label: "About", href: "/about", built: false },
  { index: "04", label: "Contact", href: "/#contact", built: true },
] as const;
