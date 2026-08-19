"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { cacheDB } from "../cache/cache-db";
import { getActiveDataset } from "../dataset";

/**
 * "Interested" speaker stars (speakers page). Mirrors useInterested (session
 * stars): browser-local user state persisted in the Dexie-backed store, keyed
 * by the active dataset's eventId. Kept in its own table so speaker ids never
 * mix into the schedule's session-star counts and filters.
 */
export function useInterestedSpeakers() {
  const eventId = getActiveDataset().eventId;

  const { data, mutate } = useSWR(
    ["interested-speakers", eventId],
    async () => {
      if (!cacheDB) return [] as string[];
      const rows = await cacheDB.interestedSpeakers
        .where("eventId")
        .equals(eventId)
        .toArray();
      return rows.map((r) => r.speakerId);
    },
    { revalidateOnFocus: false }
  );

  // Stable identity matters: `ids` feeds the speakers list's filter memos,
  // so a fresh Set each render would re-filter the whole list every tick.
  const ids = useMemo(() => new Set(data ?? []), [data]);

  const toggle = useCallback(
    // Pass `name` to confirm additions with a toast — the hook decides
    // add-vs-remove from the store, so call sites don't duplicate that check.
    async (speakerId: string, name?: string) => {
      if (!cacheDB) return;
      const key: [string, string] = [eventId, speakerId];
      // Transaction: a bare get-then-put lets two rapid taps both read
      // "missing" and both add — the star ends on when the user meant off.
      const added = await cacheDB.transaction(
        "rw",
        cacheDB.interestedSpeakers,
        async () => {
          const existing = await cacheDB.interestedSpeakers.get(key);
          if (existing) {
            await cacheDB.interestedSpeakers.delete(key);
            return false;
          }
          await cacheDB.interestedSpeakers.put({
            eventId,
            speakerId,
            addedAt: Date.now(),
          });
          return true;
        }
      );
      if (added && name)
        toast(
          // Single wrapping span: sonner's title slot is a flex row, so
          // multiple top-level children render as columns, not inline text.
          <span>
            <span className="font-semibold">{name}</span> was added to your
            Interests.
          </span>
        );
      await mutate();
    },
    [eventId, mutate]
  );

  return {
    ids,
    isInterested: (speakerId: string) => ids.has(speakerId),
    toggle,
    count: ids.size,
  };
}
