"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { DETAIL_ROUTES, VIEW_PARAMS, type DetailKind } from "./viewParams";

/**
 * Marker on history entries we pushed, so `closeDetail` knows whether back()
 * lands on the list (our entry) or would leave the app (deep-link entry).
 * Next 16 copies its own internals (__NA, tree) into the state object we pass,
 * so the marker survives; we must pass a FRESH object, never the existing
 * history.state, or Next treats the call as its own and skips syncing the URL.
 */
const MARKER = "dcDetail";

/**
 * Open a detail view in place. `history.pushState` is patched by Next's App
 * Router to update `useSearchParams`/`usePathname` without fetching any RSC
 * payload, which is exactly what makes details work offline and instant.
 */
export function openDetail(kind: DetailKind, id: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set(kind, id);
  window.history.pushState({ [MARKER]: true }, "", url.toString());
}

/** Close the detail view: back() if we pushed it, else drop the param in place. */
export function closeDetail(kind: DetailKind): void {
  const state = window.history.state as Record<string, unknown> | null;
  if (state && state[MARKER] === true) {
    window.history.back();
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.delete(kind);
  window.history.replaceState({}, "", url.toString());
}

/** The selected detail id for `kind` on the current shell, plus stable open/close. */
export function useDetailParam(kind: DetailKind) {
  const params = useSearchParams();
  const id = params.get(kind);
  const open = useCallback((next: string) => openDetail(kind, next), [kind]);
  const close = useCallback(() => closeDetail(kind), [kind]);
  return { id, open, close };
}

/** Which detail view the URL selects, if any (header, nav and layout read this). */
export function useDetailView(): { kind: DetailKind | null; id: string | null } {
  const pathname = usePathname();
  const params = useSearchParams();
  for (const kind of VIEW_PARAMS) {
    if (pathname === DETAIL_ROUTES[kind]) {
      const id = params.get(kind);
      if (id) return { kind, id };
    }
  }
  return { kind: null, id: null };
}
