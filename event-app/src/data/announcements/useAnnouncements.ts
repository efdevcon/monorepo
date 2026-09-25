"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { cacheDB } from "@/data/cache/cache-db";
import { useNowMs } from "@/hooks/useNow";
import { markSeen, UNREAD_WINDOW_MS, useSeenIds } from "./seenState";
import type { Announcement, AnnouncementsResponse } from "./types";

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
 * readable offline after the first load. Read state: the inbox's shared
 * Dexie-backed snapshot (seenState.ts), shared with the session reminders.
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
  // The app clock, mock included: under `?mockNow=` or the preview's
  // event-start mock, announcements reveal, group and age on the same clock
  // as the schedule and the reminders (Didier, 2026-09-24; the Notion test
  // rows are dated inside the devcon-7 mock window for that).
  const nowMs = useNowMs(60_000);

  const { data, error, isValidating, mutate } = useSWR(
    enabled ? ["announcements", preview ? "preview" : "published"] : null,
    () => fetchAnnouncements(preview),
    { revalidateOnFocus: false, dedupingInterval: 10_000 }
  );

  const { seenIds } = useSeenIds(enabled);

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
  const allHighlights = useMemo(
    () =>
      (data ?? [])
        .filter((a) => a.type === "highlight")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [data]
  );

  /**
   * The home-screen hero: the highlight with Featured ticked in Notion, or
   * null. Purely opt-in — no highlight ticked means no Featured section at all.
   *
   * Deliberately not falling back to a positional pick (e.g. the last
   * highlight). A fallback would mean unticking the box silently promotes some
   * other card rather than hiding the section, and reordering the carousel
   * could change the hero as a side effect. Opting in is the predictable
   * version: what an editor ticks is what shows.
   *
   * If two rows are ticked the first by Order wins — arbitrary but stable, since
   * a per-row checkbox can't express "only one".
   */
  const featured = useMemo(
    () => allHighlights.find((h) => h.featured) ?? null,
    [allHighlights]
  );

  /**
   * The carousel, minus whatever is already the hero — otherwise the featured
   * card renders twice on the same screen.
   */
  const highlights = useMemo(
    () => allHighlights.filter((h) => h.id !== featured?.id),
    [allHighlights, featured]
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
    const now = Date.now();
    markSeen(
      data
        .filter(
          (a) =>
            a.type === "announcement" && new Date(a.sendAt).getTime() <= now
        )
        .map((a) => a.id)
    );
  }, [data, preview]);

  return {
    announcements,
    highlights,
    featured,
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
