"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  DETAIL_ROUTES,
  detailHref,
  parseDetailPath,
  type DetailKind,
} from "./viewParams";

/**
 * Marker on history entries we pushed, so `closeDetail` knows whether back()
 * lands on the list (our entry) or would leave the app (deep-link entry).
 * Next 16 copies its own internals (__NA, tree) into the state object we pass,
 * so the marker survives; we must pass a FRESH object, never the existing
 * history.state, or Next treats the call as its own and skips syncing the URL.
 */
const MARKER = "dcDetail";

/** `pathname` with the current query string (dataset, mockNow, …) kept. */
function withCurrentSearch(pathname: string): string {
  return `${pathname}${window.location.search}`;
}

/**
 * Open a detail page in place: the URL becomes `/schedule/<id>` (or
 * `/speakers/<id>`) through `history.pushState`, which Next's App Router
 * patches to update `usePathname` without fetching any RSC payload. The list
 * tab's pane stays mounted and renders the detail from the local store, which
 * is what makes details instant and offline-capable.
 */
export function openDetail(kind: DetailKind, id: string): void {
  window.history.pushState(
    { [MARKER]: true },
    "",
    withCurrentSearch(detailHref(kind, id))
  );
}

let closing = false;

/**
 * Close the detail page: back() if we pushed it, else (deep link, first
 * entry) swap the URL for the list tab in place. Never leaves the app. A
 * second tap while a back() is still in flight is ignored, otherwise a quick
 * double tap on the arrow walks one entry too far (and out of the app).
 */
export function closeDetail(kind: DetailKind): void {
  if (closing) return;
  const state = window.history.state as Record<string, unknown> | null;
  if (state && state[MARKER] === true) {
    closing = true;
    const done = () => {
      closing = false;
      window.removeEventListener("popstate", done);
    };
    window.addEventListener("popstate", done);
    // Safety net if no popstate arrives (some browsers drop it on a no-op).
    setTimeout(done, 600);
    window.history.back();
    return;
  }
  window.history.replaceState({}, "", withCurrentSearch(DETAIL_ROUTES[kind]));
}

/**
 * The detail id the URL selects for `kind`, plus stable open/close. Live for
 * every pane, visible or hidden: a session page linking to a speaker changes
 * the URL to `/speakers/<id>`, so the (now hidden) Schedule pane drops its
 * detail at once. Anything with side effects that must only run on screen
 * (scroll restores, body locks, header portals) gates on `usePaneActive()`
 * itself rather than on a stale detail id.
 */
export function useDetailRoute(kind: DetailKind) {
  const pathname = usePathname();
  const detail = parseDetailPath(pathname);
  const id = detail && detail.kind === kind ? detail.id : null;
  const open = useCallback((next: string) => openDetail(kind, next), [kind]);
  const close = useCallback(() => closeDetail(kind), [kind]);
  return { id, open, close };
}

/** Which detail page the URL is on, if any (header, nav and layout read this). */
export function useDetailView(): { kind: DetailKind | null; id: string | null } {
  const pathname = usePathname();
  return parseDetailPath(pathname) ?? { kind: null, id: null };
}
