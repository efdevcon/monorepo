"use client";

import { useEffect, useState } from "react";
import { cacheDB } from "@/data/cache/cache-db";

/** Unread badges only count unseen items from the last 3 days. */
export const UNREAD_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

// Read state for the inbox, shared by both kinds of item in it: Notion
// announcements (keyed by page id) and session reminders (keyed
// `reminder:<sessionId>`, see data/reminders/reminders.ts). One Dexie table,
// one module-level snapshot loaded once, with subscribers notified on every
// change — Nav, the home section and the inbox page all mount their own hook
// instance, and visiting the inbox must clear the header badge without a
// reload.
let seenIdsSnapshot: Set<string> | null = null;
let seenIdsLoad: Promise<void> | null = null;
const listeners = new Set<() => void>();

function loadSeenIds(): Promise<void> {
  if (!seenIdsLoad) {
    seenIdsLoad = cacheDB
      ? cacheDB.seenAnnouncements.toArray().then((rows) => {
          seenIdsSnapshot = new Set(rows.map((r) => r.id));
          listeners.forEach((fn) => fn());
        })
      : Promise.resolve();
  }
  return seenIdsLoad;
}

function publish(next: Set<string>): void {
  seenIdsSnapshot = next;
  listeners.forEach((fn) => fn());
}

/**
 * The set of seen ids, `null` until the Dexie read state has hydrated (so
 * callers can treat everything as seen meanwhile instead of flashing dots).
 * `enabled: false` skips the subscription and the Dexie read.
 */
export function useSeenIds(enabled = true): {
  seenIds: Set<string> | null;
  ready: boolean;
} {
  const [seenIds, setSeenIds] = useState<Set<string> | null>(seenIdsSnapshot);
  useEffect(() => {
    if (!enabled) return;
    const update = () => setSeenIds(seenIdsSnapshot);
    listeners.add(update);
    loadSeenIds().then(update);
    return () => {
      listeners.delete(update);
    };
  }, [enabled]);
  return { seenIds, ready: seenIds !== null };
}

/** Persist these ids as seen and notify every mounted subscriber at once. */
export function markSeen(ids: readonly string[]): void {
  if (!cacheDB || ids.length === 0) return;
  const seenAt = Date.now();
  cacheDB.seenAnnouncements
    .bulkPut(ids.map((id) => ({ id, seenAt })))
    .catch((err) => {
      console.error("Failed to persist read state:", err);
    });
  const next = new Set(seenIdsSnapshot ?? []);
  for (const id of ids) next.add(id);
  publish(next);
}
