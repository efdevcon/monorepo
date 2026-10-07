"use client";

import { useMemo } from "react";
import { storeFor, useScheduleSource } from "../store/schedule-source";
import { useEventStore, useStoreState } from "../store/use-event-store";
import { statusFlags, useForceSync } from "./use-sessions";

/** All speakers of the active event, from the EventStore snapshot. */
export function useSpeakers() {
  const state = useEventStore();
  const flags = statusFlags(state, state.snapshot.speakers.length > 0);
  const mutate = useForceSync();
  return {
    speakers: state.snapshot.speakers,
    isLoading: flags.isLoading,
    isError: flags.error,
    error: flags.error,
    mutate,
  };
}

/** One speaker by id; a Community Hub speaker (only in the hubs store) resolves too. */
export function useSpeaker(id: string) {
  const source = useScheduleSource();
  const state = useEventStore();
  const other = useStoreState(storeFor(source === "hubs" ? "main" : "hubs"));
  const speaker = id ? (state.snapshot.speakerById.get(id) ?? other.snapshot.speakerById.get(id) ?? null) : null;
  const flags = statusFlags(state, state.snapshot.speakers.length > 0);
  const mutate = useForceSync();
  return {
    speaker,
    isLoading: flags.isLoading && !speaker,
    isError: speaker ? undefined : flags.error,
    error: speaker ? undefined : flags.error,
    mutate,
  };
}

export function useSearchSpeakers(query: string) {
  const { speakers, isLoading, error, mutate } = useSpeakers();
  const q = query.trim().toLowerCase();
  const results = useMemo(
    () => (q ? speakers.filter((s) => s.name.toLowerCase().includes(q)) : []),
    [speakers, q]
  );
  return { speakers: results, isLoading, isError: error, error, mutate };
}
