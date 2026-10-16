import { ViewTransition } from "react";

/**
 * A run's title, named so it morphs between the home rows, the /work index, the run report
 * header and the "Next run" link (View Transitions; browsers without support just navigate).
 */
export function RunTitle({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <ViewTransition name={`run-title-${slug}`} share="morph" default="none">
      <span style={{ display: "inline-block" }}>{children}</span>
    </ViewTransition>
  );
}
