"use client";

import { useSyncExternalStore } from "react";
import { readFreeze } from "@/lib/freeze";

const FROZEN_TIME = "19:42"; // the time shown in the design, used by ?freeze screenshots

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 10_000);
  return () => window.clearInterval(id);
}

/** Owner's live local time. Rendered on the client only; the server sends a same-width placeholder. */
export function NavClock({ timezone }: { timezone: string | null }) {
  const time = useSyncExternalStore(
    subscribe,
    () =>
      readFreeze()
        ? FROZEN_TIME
        : new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: timezone ?? "UTC",
          }).format(new Date()),
    () => "--:--",
  );
  return <time>{time}</time>;
}
