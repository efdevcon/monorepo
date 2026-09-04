"use client";

import { useEventStore } from "../store/use-event-store";
import type { SyncStatus } from "../store/event-store";

/** Sync state for the offline pill, freshness copy and the debug panel. */
export function useSyncStatus(): {
  status: SyncStatus;
  version: string | null;
  syncedAt: number | null;
  checkedAt: number | null;
  hydrateMs: number | null;
  lastError: string | null;
} {
  const { status, meta, hydrateMs, lastError } = useEventStore();
  return {
    status,
    version: meta?.version ?? null,
    syncedAt: meta?.syncedAt ?? null,
    checkedAt: meta?.checkedAt ?? null,
    hydrateMs,
    lastError,
  };
}
