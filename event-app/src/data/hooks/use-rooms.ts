"use client";

import { useEventStore } from "../store/use-event-store";
import { statusFlags, useForceSync } from "./use-sessions";

export function useRooms() {
  const state = useEventStore();
  const flags = statusFlags(state, state.snapshot.rooms.length > 0);
  const mutate = useForceSync();
  return {
    rooms: state.snapshot.rooms,
    isLoading: flags.isLoading,
    isError: flags.error,
    error: flags.error,
    mutate,
  };
}

export function useRoom(id: string) {
  const state = useEventStore();
  const room = id ? (state.snapshot.roomById.get(id) ?? null) : null;
  const flags = statusFlags(state, state.snapshot.rooms.length > 0);
  const mutate = useForceSync();
  return {
    room,
    isLoading: flags.isLoading && !room,
    isError: room ? undefined : flags.error,
    error: room ? undefined : flags.error,
    mutate,
  };
}
