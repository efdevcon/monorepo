"use client";

import { useCallback, useMemo } from "react";
import { useInterested } from "@/data/interested/useInterested";
import { useSessions } from "@/data/hooks";
import { useNowMs } from "@/hooks/useNow";
import {
  markSeen,
  UNREAD_WINDOW_MS,
  useSeenIds,
} from "@/data/announcements/seenState";
import { deriveReminders, type ReminderItem } from "./reminders";

/**
 * The inbox's session reminders ("Interested session starts in REMINDER_LEAD_MINUTES
 * minutes", merged into the timeline with the team's announcements), derived
 * on the device from the local stars, the event catalogue and the clock — no
 * fetch, so it works offline and signed out, and honours `?mockNow=`. The server push (src/app/api/push/reminders.ts) is only a
 * best-effort accelerant for the same moment.
 *
 * Event clock (`useNowMs`), not the real-world one announcements use: a
 * reminder is dated against the schedule. Read state shares the
 * announcements' Dexie table under `reminder:` ids (seenState.ts).
 */
export function useSessionReminders(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const { ids } = useInterested();
  const { sessions, isLoading } = useSessions();
  const nowMs = useNowMs(60_000);
  const { seenIds, ready } = useSeenIds(enabled);

  const items = useMemo(
    () => (enabled ? deriveReminders(sessions, ids, nowMs) : []),
    [enabled, sessions, ids, nowMs]
  );
  const reminders = useMemo(
    () =>
      items.map((r) => ({
        ...r,
        seen: seenIds?.has(r.id) ?? true, // "all seen" until read state hydrates
      })),
    [items, seenIds]
  );

  const unreadCount = useMemo(
    () =>
      reminders.filter(
        (r) => !r.seen && nowMs - r.remindAtMs <= UNREAD_WINDOW_MS
      ).length,
    [reminders, nowMs]
  );

  // Keyed on the id list, not on `items`: the list only changes when a
  // reminder crosses its threshold, so the inbox's mark-seen effect doesn't
  // re-fire on every clock tick.
  const idsKey = items.map((r) => r.id).join("|");
  const markAllSeen = useCallback(() => {
    if (idsKey) markSeen(idsKey.split("|"));
  }, [idsKey]);

  return {
    reminders: reminders as (ReminderItem & { seen: boolean })[],
    unreadCount,
    /** True while the catalogue has never loaded (no stars can resolve yet). */
    isLoading,
    /** True once the Dexie read state has hydrated (unread info is real). */
    readStateReady: ready,
    markAllSeen,
    /** Sessions marked interested on this device for the active event, due or not. */
    interestedCount: ids.size,
  };
}
