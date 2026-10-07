"use client";

import { useSyncExternalStore } from "react";
import { SERVER_STATE, type EventStore, type StoreState } from "./event-store";
import { storeFor, useScheduleSource } from "./schedule-source";

/** Subscribe a component to one store's snapshot (tear-free, SSR-safe). */
export function useStoreState(store: EventStore): StoreState {
  return useSyncExternalStore(store.subscribe, store.getState, () => SERVER_STATE);
}

/**
 * The store behind the current schedule source: the Pretalx schedule by
 * default, the Community Hubs store inside the Schedule tab's hubs segment.
 */
export function useEventStore(): StoreState {
  return useStoreState(storeFor(useScheduleSource()));
}
