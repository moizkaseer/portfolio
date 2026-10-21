"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import type { AgentMode } from "@/lib/agent/mode";

// The palette itself loads on first use, never in the initial bundle (brief §9).
const CommandPalette = lazy(() => import("./CommandPalette"));
// the Shift+G grid overlay (dev aid + easter egg) also loads on first use
const GridOverlay = lazy(() => import("@/components/grid/GridOverlay"));
// the agent (chat, ghost pointer, actions) loads on the first click / focus of an "Ask the agent" trigger
const loadAgent = () => import("@/components/agent/AgentRoot");
const AgentRoot = lazy(loadAgent);
type AgentApi = Awaited<ReturnType<typeof loadAgent>>["agentApi"];

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/** ⌘K / Ctrl+K / "/" opens the command palette; [data-agent-*] triggers load and open the agent. */
export function CommandPaletteLauncher({ email, agentMode }: { email: string; agentMode: AgentMode }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [grid, setGrid] = useState(false);
  const [agent, setAgent] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.code === "KeyG" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        setGrid((g) => !g);
        return;
      }
      const combo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const slash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target);
      if (!combo && !slash) return;
      e.preventDefault();
      setLoaded(true);
      setOpen((v) => (combo ? !v : true));
    };
    const onOpen = () => {
      setLoaded(true);
      setOpen(true);
    };
    const withAgent = (fn: (a: AgentApi) => void) => {
      setAgent(true);
      loadAgent().then((m) => fn(m.agentApi));
    };
    const onClick = (e: MouseEvent) => {
      const t = (e.target as Element).closest?.<HTMLElement>("[data-agent-open],[data-agent-ask]");
      if (!t) return;
      e.preventDefault();
      e.stopPropagation(); // the no-JS fallback href ("/#agent") must not reach Lenis' anchor scrolling
      const q = t.dataset.agentAsk;
      withAgent((a) => (q ? a.ask(q) : a.open()));
    };
    const onFocus = (e: FocusEvent) => (e.target as Element).closest?.("[data-agent-input]") && withAgent(() => {});
    const onAgent = () => withAgent((a) => a.open());
    window.addEventListener("keydown", onKey);
    window.addEventListener("palette:open", onOpen);
    window.addEventListener("agent:open", onAgent);
    document.addEventListener("click", onClick, true); // capture: before a Link navigates
    document.addEventListener("focusin", onFocus);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("palette:open", onOpen);
      window.removeEventListener("agent:open", onAgent);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);

  return (
    <Suspense fallback={null}>
      {loaded && <CommandPalette open={open} onClose={() => setOpen(false)} email={email} />}
      {grid && <GridOverlay />}
      {agent && <AgentRoot mode={agentMode} />}
    </Suspense>
  );
}
