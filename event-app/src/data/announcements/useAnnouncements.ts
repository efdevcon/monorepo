"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { cacheDB } from "@/data/cache/cache-db";
import { useNowMs } from "@/hooks/useNow";
import type { Announcement, AnnouncementsResponse } from "./types";

/** Unread badge only counts unseen announcements from the last 3 days. */
const UNREAD_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

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
 * The announcements feed plus device-local read state.
 *
 * Feed: SWR backed by the Dexie cache (src/data/cache), so announcements stay
 * readable offline after the first load. Read state: its own Dexie table
 * (`seenAnnouncements`), so the unread badge also survives restarts offline.
 *
 * Announcements are time-gated against the mockable clock: the server already
 * excludes future rows, but a CDN-cached response plus `?mockNow=` testing
 * make the client-side gate load-bearing too.
 */
export function useAnnouncements() {
  const preview = useIsPreview();
  const nowMs = useNowMs(60_000);

  const { data, error, isValidating, mutate } = useSWR(
    ["announcements", preview ? "preview" : "published"],
    () => fetchAnnouncements(preview),
    { revalidateOnFocus: false, dedupingInterval: 10_000 }
  );

  // Read state, loaded once from Dexie (null until hydrated).
  const [seenIds, setSeenIds] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!cacheDB) return;
    let cancelled = false;
    cacheDB.seenAnnouncements.toArray().then((rows) => {
      if (!cancelled) setSeenIds(new Set(rows.map((r) => r.id)));
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  /** Mark all current announcements as seen (called by the inbox). */
  const markAllSeen = useCallback(() => {
    if (!cacheDB || !data) return;
    const rows = data
      .filter((a) => a.type === "announcement")
      .map((a) => ({ id: a.id, seenAt: nowMs }));
    cacheDB.seenAnnouncements.bulkPut(rows).catch((err) => {
      console.error("Failed to persist announcement read state:", err);
    });
    setSeenIds((prev) => {
      const next = new Set(prev ?? []);
      for (const row of rows) next.add(row.id);
      return next;
    });
  }, [data, nowMs]);

  return {
    announcements,
    highlights,
    unreadCount,
    isLoading: data === undefined && error === undefined,
    /** True during a background revalidation when data exists. */
    isRefreshing: isValidating && data !== undefined,
    error: error as Error | undefined,
    refresh: () => mutate(),
    markAllSeen,
  };
}
