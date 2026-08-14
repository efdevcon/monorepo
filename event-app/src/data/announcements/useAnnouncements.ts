"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { cacheDB } from "@/data/cache/cache-db";
import { useRealWorldNowMs } from "@/hooks/useNow";
import type { Announcement, AnnouncementsResponse } from "./types";

/** Unread badge only counts unseen announcements from the last 3 days. */
const UNREAD_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

// Read state is shared across hook instances (Nav, home section, inbox page
// all mount their own copy): one module-level snapshot, loaded from Dexie
// once, with subscribers notified on every change — otherwise marking the
// inbox read would never clear the Nav badge until a full reload.
let seenIdsSnapshot: Set<string> | null = null;
let seenIdsLoad: Promise<void> | null = null;
const seenIdsListeners = new Set<() => void>();

function loadSeenIds(): Promise<void> {
  if (!seenIdsLoad) {
    seenIdsLoad = cacheDB
      ? cacheDB.seenAnnouncements.toArray().then((rows) => {
          seenIdsSnapshot = new Set(rows.map((r) => r.id));
          seenIdsListeners.forEach((fn) => fn());
        })
      : Promise.resolve();
  }
  return seenIdsLoad;
}

function publishSeenIds(next: Set<string>): void {
  seenIdsSnapshot = next;
  seenIdsListeners.forEach((fn) => fn());
}

async function fetchAnnouncements(preview: boolean): Promise<Announcement[]> {
  const res = await fetch(
    preview ? "/api/announcements/preview" : "/api/announcements"
  );
  const json: AnnouncementsResponse = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || "Failed to load announcements");
  }
  return json.data.announcements;
}

/**
 * Editors open the app with ?preview to see unpublished/scheduled Notion
 * edits (uncached endpoint, future rows included). Read client-side on mount
 * only, like the mockNow params.
 */
function useIsPreview(): boolean {
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    setPreview(new URLSearchParams(window.location.search).has("preview"));
  }, []);
  return preview;
}

/**
 * The announcements + highlights feed plus device-local read state.
 *
 * Feed: SWR backed by the Dexie cache (src/data/cache), so everything stays
 * readable offline after the first load. Read state: its own Dexie table
 * (`seenAnnouncements`), shared across all hook instances.
 *
 * Announcements are time-gated against the mockable clock: the server already
 * excludes future rows, but a CDN-cached response plus `?mockNow=` testing
 * make the client-side gate load-bearing too.
 *
 * Pass `enabled: false` to fully switch the hook off (no fetch, no Dexie
 * read) — used by callers gated on APP_CONFIG.ANNOUNCEMENTS_ENABLED and by
 * the room-screen kiosk.
 */
export function useAnnouncements(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const preview = useIsPreview();
  const nowMs = useRealWorldNowMs(60_000);

  const { data, error, isValidating, mutate } = useSWR(
    enabled ? ["announcements", preview ? "preview" : "published"] : null,
    () => fetchAnnouncements(preview),
    { revalidateOnFocus: false, dedupingInterval: 10_000 }
  );

  // Subscribe this instance to the shared read-state snapshot.
  const [seenIds, setSeenIds] = useState<Set<string> | null>(seenIdsSnapshot);
  useEffect(() => {
    if (!enabled) return;
    const update = () => setSeenIds(seenIdsSnapshot);
    seenIdsListeners.add(update);
    loadSeenIds().then(update);
    return () => {
      seenIdsListeners.delete(update);
    };
  }, [enabled]);

  const announcements = useMemo(() => {
    const list = (data ?? []).filter(
      (a) =>
        a.type === "announcement" &&
        (preview || new Date(a.sendAt).getTime() <= nowMs)
    );
    return list.map((a) => ({
      ...a,
      seen: seenIds?.has(a.id) ?? true, // "all seen" until read state hydrates
    }));
  }, [data, seenIds, nowMs, preview]);

  // Highlights: evergreen home-screen cards. Curated order, no read state,
  // no time gate (Visible in Notion is their on/off switch).
  const highlights = useMemo(
    () =>
      (data ?? [])
        .filter((a) => a.type === "highlight")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [data]
  );

  const unreadCount = useMemo(
    () =>
      announcements.filter(
        (a) =>
          !a.seen && nowMs - new Date(a.sendAt).getTime() <= UNREAD_WINDOW_MS
      ).length,
    [announcements, nowMs]
  );

  /**
   * Mark all currently-live announcements as seen (called by the inbox).
   * No-op in preview mode: an editor checking a scheduled announcement must
   * not consume its own future unread state. Deliberately NOT memoized on
   * nowMs — seenAt is bookkeeping, not time-dependent UI, and depending on
   * the ticking clock would re-fire the inbox's effect every minute.
   */
  const markAllSeen = useCallback(() => {
    if (!cacheDB || !data || preview) return;
    const seenAt = Date.now();
    const rows = data
      .filter(
        (a) =>
          a.type === "announcement" && new Date(a.sendAt).getTime() <= seenAt
      )
      .map((a) => ({ id: a.id, seenAt }));
    if (rows.length === 0) return;
    cacheDB.seenAnnouncements.bulkPut(rows).catch((err) => {
      console.error("Failed to persist announcement read state:", err);
    });
    const next = new Set(seenIdsSnapshot ?? []);
    for (const row of rows) next.add(row.id);
    publishSeenIds(next);
  }, [data, preview]);

  return {
    announcements,
    highlights,
    unreadCount,
    isLoading: enabled && data === undefined && error === undefined,
    /** True once the Dexie read state has hydrated (unread info is real). */
    readStateReady: seenIds !== null,
    /** True during a background revalidation when data exists. */
    isRefreshing: isValidating && data !== undefined,
    error: error as Error | undefined,
    refresh: () => mutate(),
    markAllSeen,
  };
}
