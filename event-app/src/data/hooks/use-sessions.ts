import useSWR from "swr";
import { provider } from "../providers/provider";
import { getActiveDatasetKey } from "../dataset";
import type { Session } from "../models";
import type { SessionFilters } from "../providers/provider-interface";

/**
 * Hook to fetch all sessions with optional filters.
 * SWR keys are namespaced by the active dataset so switching datasets doesn't
 * serve another dataset's cached data.
 */
export function useSessions(filters?: SessionFilters) {
  const ds = getActiveDatasetKey();
  const key = filters ? [ds, "sessions", filters] : [ds, "sessions"];

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    () => provider.getSessions(filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    sessions: data ?? [],
    isLoading,
    isValidating,
    // Offline-first: a failed background revalidation must not hide data we
    // already have cached. Only report an error when there's no data at all
    // (`data` is undefined until the first successful fetch — an empty array
    // means a successful fetch that returned nothing).
    isError: data !== undefined ? undefined : error,
    error: data !== undefined ? undefined : error,
    mutate,
  };
}

/**
 * Hook to fetch a single session by ID.
 *
 * Derives from the cached full session list instead of fetching `/sessions/:id`
 * separately, so a session never opened while online still renders offline once
 * the list has loaded. The list endpoint returns the same fields, so nothing is
 * lost by selecting from it.
 */
export function useSession(id: string) {
  const { sessions, isLoading, error, mutate } = useSessions();
  const session = id ? sessions.find((s) => s.id === id) ?? null : null;

  return {
    session,
    isLoading: isLoading && !session,
    // Offline-first: don't surface an error if we have cached data to render.
    isError: session ? undefined : error,
    error: session ? undefined : error,
    mutate,
  };
}

/**
 * Hook to fetch sessions by speaker ID. Filters the cached full list so it works
 * offline (and shares the same cache as the schedule).
 */
export function useSessionsBySpeaker(speakerId: string) {
  const { sessions, isLoading, error, mutate } = useSessions();
  const filtered = speakerId
    ? sessions.filter((s) => s.speakers?.some((sp) => sp.id === speakerId))
    : [];

  return {
    sessions: filtered,
    isLoading,
    isError: error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch sessions by track. Filters the cached full list (offline-safe).
 */
export function useSessionsByTrack(track: string) {
  const { sessions, isLoading, error, mutate } = useSessions();
  const filtered = track ? sessions.filter((s) => s.track === track) : [];

  return {
    sessions: filtered,
    isLoading,
    isError: error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch sessions by day. Filters the cached full list (offline-safe).
 */
export function useSessionsByDay(day: string) {
  const { sessions, isLoading, error, mutate } = useSessions();
  const filtered = day ? sessions.filter((s) => s.day === day || s.date === day) : [];

  return {
    sessions: filtered,
    isLoading,
    isError: error,
    error,
    mutate,
  };
}
