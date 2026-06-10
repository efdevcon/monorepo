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
    isError: error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch a single session by ID
 */
export function useSession(id: string) {
  const ds = getActiveDatasetKey();
  const { data, error, isLoading, mutate } = useSWR(
    id ? [ds, "session", id] : null,
    () => provider.getSession(id),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    session: data ?? null,
    isLoading,
    isError: error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch sessions by speaker ID
 */
export function useSessionsBySpeaker(speakerId: string) {
  const ds = getActiveDatasetKey();
  const { data, error, isLoading, mutate } = useSWR(
    speakerId ? [ds, "sessions", "speaker", speakerId] : null,
    () => provider.getSessionsBySpeaker(speakerId),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    sessions: data ?? [],
    isLoading,
    isError: error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch sessions by track
 */
export function useSessionsByTrack(track: string) {
  const ds = getActiveDatasetKey();
  const { data, error, isLoading, mutate } = useSWR(
    track ? [ds, "sessions", "track", track] : null,
    () => provider.getSessionsByTrack(track),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    sessions: data ?? [],
    isLoading,
    isError: error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch sessions by day
 */
export function useSessionsByDay(day: string) {
  const ds = getActiveDatasetKey();
  const { data, error, isLoading, mutate } = useSWR(
    day ? [ds, "sessions", "day", day] : null,
    () => provider.getSessionsByDay(day),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    sessions: data ?? [],
    isLoading,
    isError: error,
    error,
    mutate,
  };
}
