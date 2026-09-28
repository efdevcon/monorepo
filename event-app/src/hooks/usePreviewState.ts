"use client";

import { useEffect, useState } from "react";

export type PreviewState = "loading" | "notfound" | "failed" | "unpublished" | "crash";

/**
 * Dev preview for the non-happy states (same pattern as
 * `?previewPushSheet=`): outside production, `?previewState=loading`,
 * `=notfound`, `=failed` or `=unpublished` forces that state wherever a
 * list, detail or ticket view honours it, so the states can be looked at
 * without throttling the network or breaking a link. `notfound` applies to
 * detail pages, `unpublished` to the schedule and speakers lists, and
 * `=crash` on Home throws so the route error page (app/error.tsx) shows.
 * Read after mount, so SSR and first paint stay the real state.
 */
export function usePreviewState(): PreviewState | null {
  const [value, setValue] = useState<PreviewState | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const v = new URLSearchParams(window.location.search).get("previewState");
    if (v === "loading" || v === "notfound" || v === "failed" || v === "unpublished" || v === "crash") {
      setValue(v);
    }
  }, []);
  return value;
}
