"use client";

import { ViewTransition, useSyncExternalStore } from "react";

const phoneQuery = () => matchMedia("(max-width: 1023.98px)");
const subscribe = (cb: () => void) => {
  const mq = phoneQuery();
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * A run's title, named so it morphs between the home rows, the /work index, the run report
 * header and the "Next run" link (View Transitions; browsers without support just navigate).
 *
 * Lists render both the desktop rows and the phone cards (CSS hides one), so a name can only
 * be mounted once: pass `layout` and the title is named only while that layout is the visible
 * one. The server and hydration pass assume desktop rows. The hidden layout gets no
 * ViewTransition at all: React keeps a name registered until the boundary unmounts, so
 * clearing the name would still collide with the visible one.
 */
export function RunTitle({ slug, layout, children }: { slug: string; layout?: "rows" | "cards"; children: React.ReactNode }) {
  const phone = useSyncExternalStore(subscribe, () => phoneQuery().matches, () => false);
  const title = <span style={{ display: "inline-block" }}>{children}</span>;
  return layout && (layout === "cards") !== phone ? (
    title
  ) : (
    <ViewTransition name={`run-title-${slug}`} share="morph" default="none">
      {title}
    </ViewTransition>
  );
}
