"use client";

import { useSyncExternalStore } from "react";

export type PreviewState = "loading" | "notfound" | "failed" | "unpublished" | "empty" | "crash";

/**
 * Dev preview for the non-happy states (same pattern as
 * `?previewPushSheet=`): outside production, `?previewState=loading`,
 * `=notfound`, `=failed` or `=unpublished` forces that state wherever a
 * list, detail or ticket view honours it, so the states can be looked at
 * without throttling the network or breaking a link. `notfound` applies to
 * detail pages, `unpublished` to the schedule and speakers lists, `empty` to
 * the notifications inbox, and `=crash` on Home throws so the route error
 * page (app/error.tsx) shows.
 * Server render and hydration always see the real state.
 */
export function usePreviewState(): PreviewState | null {
  const v = usePreviewParam("previewState");
  return v === "loading" ||
    v === "notfound" ||
    v === "failed" ||
    v === "unpublished" ||
    v === "empty" ||
    v === "crash"
    ? v
    : null;
}

export type PreviewQA = "loading" | "failed" | "empty" | "closed";

/**
 * Same idea for the Live Q&A block on a session (its own param, since the
 * session page itself reads `previewState`): `?previewQA=loading`,
 * `=failed`, `=empty` or `=closed`. Outside production only.
 */
export function usePreviewQA(): PreviewQA | null {
  const v = usePreviewParam("previewQA");
  return v === "loading" || v === "failed" || v === "empty" || v === "closed" ? v : null;
}

// The URL's query at call time; null on the server and in production, so
// SSR and hydration always match the real state.
const noSubscribe = () => () => {};
function usePreviewParam(name: string): string | null {
  return useSyncExternalStore(
    noSubscribe,
    () =>
      process.env.NODE_ENV === "production"
        ? null
        : new URLSearchParams(window.location.search).get(name),
    () => null
  );
}
