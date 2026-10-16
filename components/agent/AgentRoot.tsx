"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { agentStore } from "@/lib/agent/store";
import { setAgentRouter } from "@/lib/agent/actions";
import { ask } from "@/lib/agent/entry";
import { ChatView } from "./ChatView";
import styles from "./Agent.module.css";

let ready: () => void;
const mounted = new Promise<void>((r) => (ready = r));

/** What the tiny trigger in the initial bundle calls once this module has loaded. */
export const agentApi = {
  async ask(text: string) {
    await mounted;
    void ask(text);
  },
  async open() {
    await mounted;
    agentStore.set({ panelOpen: true });
  },
};

/**
 * The agent, loaded on demand (first click / focus / ⌘K). Lives in the root layout, so the
 * conversation and the ghost pointer survive navigation. On the home page it takes over the
 * section 06 terminal; elsewhere (or when the agent's actions leave section 06) it shows as a
 * floating panel on desktop and a bottom sheet on phones, which shrinks to a pill while the
 * agent acts.
 */
export default function AgentRoot({ mode }: { mode: "demo" | "live" }) {
  const router = useRouter();
  const pathname = usePathname();
  const s = useSyncExternalStore(agentStore.subscribe, agentStore.get, agentStore.get);
  const [slot, setSlot] = useState<{ el: HTMLElement; input: string } | null>(null);
  const [slotVisible, setSlotVisible] = useState(false);

  useEffect(() => {
    agentStore.set({ mode });
    setAgentRouter(router);
    ready();
  }, [mode, router]);

  // home: take over the section 06 terminal (the static design markup stays for no-JS)
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-agent-terminal]");
    if (!el) {
      requestAnimationFrame(() => setSlot(null));
      return;
    }
    const typed = el.querySelector<HTMLInputElement>("[data-agent-input]")?.value ?? "";
    el.dataset.live = "true";
    requestAnimationFrame(() => setSlot({ el, input: typed }));
    const io = new IntersectionObserver(([e]) => setSlotVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => {
      io.disconnect();
      delete el.dataset.live;
    };
  }, [pathname]);

  // once the agent's actions take the visitor away from section 06, the conversation follows
  // them in the panel (and stays there after a navigation, e.g. into a run report)
  const away = !(slot && slotVisible);
  useEffect(() => {
    if (s.acting && away && !agentStore.get().panelOpen) agentStore.set({ panelOpen: true });
  }, [s.acting, away]);
  const showPanel = s.panelOpen && away;

  useEffect(() => {
    document.documentElement.toggleAttribute("data-agent-panel", showPanel);
  }, [showPanel]);

  // brief: the favicon — a single --signal square — pulses in the tab while the agent answers
  // (tabs don't animate SVG icons, so the icon is swapped between two frames)
  useEffect(() => {
    if (!s.busy) return;
    const links = [...document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']")];
    const original = links.map((l) => l.href);
    const frame = (o: number) =>
      `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" fill="#FF4F1A" fill-opacity="${o}"/></svg>`)}`;
    const frames = [frame(0.35), frame(1)];
    let i = 0;
    const tick = () => links.forEach((l) => (l.href = frames[i++ % 2]));
    tick();
    const id = window.setInterval(tick, 600);
    document.documentElement.dataset.agentBusy = "";
    return () => {
      window.clearInterval(id);
      links.forEach((l, j) => (l.href = original[j]));
      delete document.documentElement.dataset.agentBusy;
    };
  }, [s.busy]);

  return (
    <>
      {slot && createPortal(<ChatView variant="section" initialInput={slot.input} />, slot.el)}
      {showPanel && (
        <div className={styles.panel} role="dialog" aria-label="Agent" data-acting={!!s.acting} data-agent-panel-el>
          <div className={styles.pill} aria-hidden={!s.acting}>
            <span className={styles.sq} data-on="true" />
            agent · {s.acting}
          </div>
          <ChatView variant="panel" onClose={() => agentStore.set({ panelOpen: false })} />
        </div>
      )}
    </>
  );
}
