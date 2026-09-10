"use client";

import { useCallback, useMemo } from "react";
import { getActiveDataset } from "../dataset";
import type { Session } from "../models";
import { eventStore, type StoreState } from "../store/event-store";
import { useEventStore } from "../store/use-event-store";

export interface SessionFilters {
  track?: string;
  type?: string;
  roomId?: string;
  search?: string;
}

/**
 * Loading/error flags shared by every catalogue hook. Offline-first: a failed
 * sync never hides data we already have. "Loading" only while nothing has ever
 * been stored for this event and a first sync is pending or running.
 */
export function statusFlags(state: StoreState, hasData: boolean) {
  const { status, meta, lastError } = state;
  const isLoading =
    !hasData && meta === null && (status === "idle" || status === "syncing");
  const error =
    !hasData && (status === "error" || status === "offline")
      ? new Error(
          lastError ??
            (status === "offline"
              ? "You're offline and nothing is saved yet"
              : "Couldn't load the schedule")
        )
      : undefined;
  return { isLoading, error, isValidating: status === "syncing" };
}

/** Force a full re-sync (the old SWR `mutate`). */
export function forceSync() {
  return eventStore.sync(getActiveDataset(), { force: true });
}

export function filterSessions(all: Session[], f: SessionFilters): Session[] {
  if (!f.track && !f.type && !f.roomId && !f.search) return all;
  const q = f.search?.trim().toLowerCase();
  return all.filter(
    (s) =>
      (!f.track || s.track === f.track) &&
      (!f.type || s.type === f.type) &&
      (!f.roomId || s.room?.id === f.roomId) &&
      (!q ||
        s.title.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        s.speakers.some((sp) => sp.name.toLowerCase().includes(q)))
  );
}

/**
 * All sessions of the active event, filtered in memory. Reads the EventStore
 * snapshot: no network here, ever. Filtering happens on the shared list, so
 * `useSessions({ roomId })` costs a filter pass, not a fetch.
 */
export function useSessions(filters?: SessionFilters) {
  const state = useEventStore();
  const { track, type, roomId, search } = filters ?? {};
  const sessions = useMemo(
    () => filterSessions(state.snapshot.sessions, { track, type, roomId, search }),
    [state.snapshot, track, type, roomId, search]
  );
  const flags = statusFlags(state, state.snapshot.sessions.length > 0);
  const mutate = useCallback(() => forceSync(), []);
  return {
    sessions,
    isLoading: flags.isLoading,
    isValidating: flags.isValidating,
    isError: flags.error,
    error: flags.error,
    mutate,
  };
}

/** One session by id from the snapshot. Works offline once the event has synced once. */
export function useSession(id: string) {
  const state = useEventStore();
  const session = id ? (state.snapshot.sessionById.get(id) ?? null) : null;
  const flags = statusFlags(state, state.snapshot.sessions.length > 0);
  const mutate = useCallback(() => forceSync(), []);
  return {
    session,
    isLoading: flags.isLoading && !session,
    isError: session ? undefined : flags.error,
    error: session ? undefined : flags.error,
    mutate,
  };
}

export function useSessionsBySpeaker(speakerId: string) {
  const { sessions, isLoading, error, mutate } = useSessions();
  const filtered = useMemo(
    () =>
      speakerId
        ? sessions.filter((s) => s.speakers?.some((sp) => sp.id === speakerId))
        : [],
    [sessions, speakerId]
  );
  return { sessions: filtered, isLoading, isError: error, error, mutate };
}

export function useSessionsByTrack(track: string) {
  const { sessions, isLoading, error, mutate } = useSessions();
  const filtered = useMemo(
    () => (track ? sessions.filter((s) => s.track === track) : []),
    [sessions, track]
  );
  return { sessions: filtered, isLoading, isError: error, error, mutate };
}

export function useSessionsByDay(day: string) {
  const { sessions, isLoading, error, mutate } = useSessions();
  const filtered = useMemo(
    () => (day ? sessions.filter((s) => s.day === day || s.date === day) : []),
    [sessions, day]
  );
  return { sessions: filtered, isLoading, isError: error, error, mutate };
}
