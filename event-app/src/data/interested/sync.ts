"use client";

import { cacheDB } from "../cache/cache-db";
import { supabase } from "../auth/supabase";
import { isOnlineNow } from "@/hooks/useOnline";
import { mergeRemote, settlePending } from "./merge";
import type { InterestChange, SyncResponse } from "./syncProtocol";

/**
 * Keeps the device's stars and the account's in step. Dexie stays the source
 * of truth and the app never waits on this: a sync pushes the
 * rows still marked pending, pulls what other devices wrote since the last
 * cursor, merges last-write-wins per item and refreshes the two SWR keys.
 * Failures leave rows pending for the next trigger (sign-in, reconnect, tab
 * focus, or 1.5 s after a toggle).
 */

type Mutate = (key: [string, string]) => Promise<unknown>;

interface SyncContext {
  userId: string;
  eventId: string;
  mutate: Mutate;
}

const DEBOUNCE_MS = 1_500;

let context: SyncContext | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;
/** A trigger arrived while a sync was running: run once more afterwards. */
let again = false;

/** Set by InterestSync while signed in; null signed out (stars stay local). */
export function setSyncContext(next: SyncContext | null): void {
  context = next;
}

export function requestInterestSync(delayMs = DEBOUNCE_MS): void {
  if (!context) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void runSync();
  }, delayMs);
}

export function runSync(): Promise<void> {
  if (inFlight) {
    again = true;
    return inFlight;
  }
  inFlight = doSync()
    .catch((err) => {
      console.warn("[interests] sync failed, will retry on the next trigger:", err);
    })
    .finally(() => {
      inFlight = null;
      if (again) {
        again = false;
        void runSync();
      }
    });
  return inFlight;
}

async function doSync(): Promise<void> {
  if (!cacheDB || !context || !isOnlineNow() || !supabase) return;
  const { userId, eventId, mutate } = context;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return;

  const metaKey = `${userId}|${eventId}`;
  const meta = await cacheDB.interestSync.get(metaKey);
  const pendingSessions = await cacheDB.interested
    .where("pending")
    .equals(1)
    .and((row) => row.eventId === eventId)
    .toArray();
  const pendingSpeakers = await cacheDB.interestedSpeakers
    .where("pending")
    .equals(1)
    .and((row) => row.eventId === eventId)
    .toArray();
  const changes: InterestChange[] = [
    ...pendingSessions.map((row) => ({
      kind: "session" as const,
      id: row.sessionId,
      interested: row.interested !== false,
      updatedAt: row.updatedAt,
    })),
    ...pendingSpeakers.map((row) => ({
      kind: "speaker" as const,
      id: row.speakerId,
      interested: row.interested !== false,
      updatedAt: row.updatedAt,
    })),
  ];

  const res = await fetch("/api/interests/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event: eventId, since: meta?.lastSyncAt ?? null, changes }),
  });
  const json = (await res.json()) as { success: boolean; data?: SyncResponse; error?: string };
  if (!json.success || !json.data) throw new Error(json.error || `HTTP ${res.status}`);
  const { changes: remote, now } = json.data;

  // The context may have changed while the request was out (sign-out, other
  // account): never write another account's answer into this device.
  if (!context || context.userId !== userId || context.eventId !== eventId) return;

  await cacheDB.transaction(
    "rw",
    [cacheDB.interested, cacheDB.interestedSpeakers, cacheDB.interestSync],
    async () => {
      for (const change of remote) {
        if (change.kind === "session") {
          const key: [string, string] = [eventId, change.id];
          const local = await cacheDB.interested.get(key);
          const merged = mergeRemote(local, change);
          if (merged) {
            await cacheDB.interested.put({
              eventId,
              sessionId: change.id,
              addedAt: local?.addedAt ?? change.updatedAt,
              ...merged,
            });
          }
        } else {
          const key: [string, string] = [eventId, change.id];
          const local = await cacheDB.interestedSpeakers.get(key);
          const merged = mergeRemote(local, change);
          if (merged) {
            await cacheDB.interestedSpeakers.put({
              eventId,
              speakerId: change.id,
              addedAt: local?.addedAt ?? change.updatedAt,
              ...merged,
            });
          }
        }
      }
      for (const pushed of pendingSessions) {
        const current = await cacheDB.interested.get([eventId, pushed.sessionId]);
        const settled = current && settlePending(current, pushed.updatedAt);
        if (settled) await cacheDB.interested.put({ ...current, ...settled });
      }
      for (const pushed of pendingSpeakers) {
        const current = await cacheDB.interestedSpeakers.get([eventId, pushed.speakerId]);
        const settled = current && settlePending(current, pushed.updatedAt);
        if (settled) await cacheDB.interestedSpeakers.put({ ...current, ...settled });
      }
      await cacheDB.interestSync.put({ key: metaKey, lastSyncAt: now });
    }
  );

  await mutate(["interested", eventId]);
  await mutate(["interested-speakers", eventId]);
}
