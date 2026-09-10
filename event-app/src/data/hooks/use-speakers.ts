"use client";

import { useCallback, useMemo } from "react";
import { useEventStore } from "../store/use-event-store";
import { forceSync, statusFlags } from "./use-sessions";

/** All speakers of the active event, from the EventStore snapshot. */
export function useSpeakers() {
  const state = useEventStore();
  const flags = statusFlags(state, state.snapshot.speakers.length > 0);
  const mutate = useCallback(() => forceSync(), []);
  return {
    speakers: state.snapshot.speakers,
    isLoading: flags.isLoading,
    isError: flags.error,
    error: flags.error,
    mutate,
  };
}

export function useSpeaker(id: string) {
  const state = useEventStore();
  const speaker = id ? (state.snapshot.speakerById.get(id) ?? null) : null;
  const flags = statusFlags(state, state.snapshot.speakers.length > 0);
  const mutate = useCallback(() => forceSync(), []);
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
