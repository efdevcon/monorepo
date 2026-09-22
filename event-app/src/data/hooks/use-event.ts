"use client";

import { useEventStore } from "../store/use-event-store";
import { statusFlags, useForceSync } from "./use-sessions";

/** The active event's metadata (title, dates, featured speakers) from the store. */
export function useEvent() {
  const state = useEventStore();
  const flags = statusFlags(state, state.snapshot.event !== undefined);
  const mutate = useForceSync();
  return {
    event: state.snapshot.event,
    isLoading: flags.isLoading,
    isError: flags.error,
    error: flags.error,
    mutate,
  };
}
