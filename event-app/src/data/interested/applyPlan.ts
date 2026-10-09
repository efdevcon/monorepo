import { mutate } from "swr";
import { cacheDB } from "../cache/cache-db";
import { emitInterestAdded } from "./interestPulse";
import { requestInterestSync } from "./sync";

/**
 * Apply a batch of star changes (the AI planner's add/remove lists) with the
 * same rows `useInterested.toggle` writes: an unstar is a tombstone, never a
 * delete, and every row is `pending` until the account has it. One
 * transaction, so a plan lands whole; the shared SWR key refreshes every
 * subscriber afterwards. Returns what actually changed.
 */
export async function applyInterestChanges(
  eventId: string,
  addIds: string[],
  removeIds: string[]
): Promise<{ added: number; removed: number }> {
  if (!cacheDB) return { added: 0, removed: 0 };
  const result = await cacheDB.transaction("rw", cacheDB.interested, async () => {
    let added = 0;
    let removed = 0;
    const now = Date.now();
    for (const sessionId of addIds) {
      const existing = await cacheDB!.interested.get([eventId, sessionId]);
      if (existing?.interested) continue;
      await cacheDB!.interested.put({
        eventId,
        sessionId,
        addedAt: existing?.addedAt ?? now,
        interested: true,
        updatedAt: now,
        pending: 1,
      });
      added++;
    }
    for (const sessionId of removeIds) {
      const existing = await cacheDB!.interested.get([eventId, sessionId]);
      if (!existing?.interested) continue;
      await cacheDB!.interested.put({ ...existing, interested: false, updatedAt: now, pending: 1 });
      removed++;
    }
    return { added, removed };
  });
  if (result.added > 0) emitInterestAdded("session");
  await mutate(["interested", eventId]);
  if (result.added > 0 || result.removed > 0) requestInterestSync();
  return result;
}
