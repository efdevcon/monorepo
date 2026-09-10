"use client";

import { useSyncExternalStore } from "react";
import { eventStore, SERVER_STATE, type StoreState } from "./event-store";

/** Subscribe a component to the EventStore snapshot (tear-free, SSR-safe). */
export function useEventStore(): StoreState {
  return useSyncExternalStore(
    eventStore.subscribe,
    eventStore.getState,
    () => SERVER_STATE
  );
}
