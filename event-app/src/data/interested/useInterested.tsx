"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { cacheDB } from "../cache/cache-db";
import { getActiveDataset } from "../dataset";
import { requestInterestSync } from "./sync";

/**
 * "Interested" session stars. Browser-local user state persisted in the
 * Dexie-backed store (offline-first rule: no parallel localStorage state),
 * keyed by the active dataset's eventId so Devcon 7 test stars don't bleed
 * into Devcon 8. All subscribers (cards, filter pill, header shortcut,
 * session details) share one SWR key and stay in sync via `mutate`.
 */
export function useInterested() {
  const eventId = getActiveDataset().eventId;

  const { data, mutate } = useSWR(
    ["interested", eventId],
    async () => {
      if (!cacheDB) return [] as string[];
      const rows = await cacheDB.interested
        .where("eventId")
        .equals(eventId)
        .toArray();
      // Tombstones (unstarred, kept for sync) are not stars.
      return rows.filter((r) => r.interested !== false).map((r) => r.sessionId);
    },
    { revalidateOnFocus: false }
  );

  // Stable identity matters: `ids` feeds useScheduleState's `groups` memo,
  // so a fresh Set each render would re-group the whole schedule every tick.
  const ids = useMemo(() => new Set(data ?? []), [data]);

  const toggle = useCallback(
    // Pass `title` to confirm additions with a toast — the hook decides
    // add-vs-remove from the store, so call sites don't duplicate that check.
    async (sessionId: string, title?: string) => {
      if (!cacheDB) return;
      const key: [string, string] = [eventId, sessionId];
      // Transaction: a bare get-then-put lets two rapid taps both read
      // "missing" and both add — the star ends on when the user meant off.
      const added = await cacheDB.transaction(
        "rw",
        cacheDB.interested,
        async () => {
          const existing = await cacheDB.interested.get(key);
          // Never delete: an unstar becomes a tombstone so the removal syncs
          // to the account and wins by time on other devices (merge.ts).
          const nowOn = !(existing?.interested ?? false);
          await cacheDB.interested.put({
            eventId,
            sessionId,
            addedAt: existing?.addedAt ?? Date.now(),
            interested: nowOn,
            updatedAt: Date.now(),
            pending: 1,
          });
          return nowOn;
        }
      );
      if (added && title)
        toast(
          // Single wrapping span: sonner's title slot is a flex row, so
          // multiple top-level children render as columns, not inline text.
          <span>
            &lsquo;<span className="font-semibold">{title}</span>&rsquo; was
            added to your Interests.
          </span>
        );
      await mutate();
      requestInterestSync();
    },
    [eventId, mutate]
  );

  return {
    ids,
    isInterested: (sessionId: string) => ids.has(sessionId),
    toggle,
    count: ids.size,
  };
}
