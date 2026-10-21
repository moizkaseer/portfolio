"use client";

import { useEffect } from "react";
import { CursorDot } from "@/components/cursor/CursorDot";
import { boot } from "@/lib/agent/mode";

/**
 * The layout's idle-loaded piece on every page (components/Deferred.tsx): the cursor dot, plus the
 * runtime agent-mode probe and Vercel Web Analytics / Speed Insights (lib/agent/mode.ts). Sharing
 * one deferred chunk keeps all of it outside the home page's 190KB initial JS budget.
 */
export function Boot() {
  useEffect(boot, []);
  return <CursorDot />;
}
