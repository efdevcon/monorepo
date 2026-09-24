"use client";

import { useSyncExternalStore } from "react";

/**
 * Open/closed state of the DevaBot panel, app-wide. The panel is mounted once
 * by the (page-layout) layout; this lets any place open it (today: the EF
 * internal tools on My Devcon, since the "AI" entry left the public header on
 * 2026-09-24) without threading a callback through the tree.
 */
let open = false;
const listeners = new Set<() => void>();

export function setDevaBotOpen(next: boolean) {
  if (open === next) return;
  open = next;
  listeners.forEach((cb) => cb());
}

export const openDevaBot = () => setDevaBotOpen(true);

export function useDevaBotOpen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => open,
    () => false
  );
}
