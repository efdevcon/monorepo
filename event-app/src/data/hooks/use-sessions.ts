import useSWR from "swr";
import { provider } from "../providers/provider";
import type { Session } from "../models";
import type { SessionFilters } from "../providers/provider-interface";

/**
 * Fetcher function for SWR
 */
async function sessionsFetcher(
  filters?: SessionFilters
): Promise<Session[]> {
  return provider.getSessions(filters);
}

/**
 * Hook to fetch all sessions with optional filters
 */
export function useSessions(filters?: SessionFilters) {
  const key = filters ? ["sessions", filters] : ["sessions"];

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => sessionsFetcher(filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    sessions: data ?? [],
    isLoading,
    isError: error,
    error,
    mutate, // Allows manual revalidation
  };
}

/**
 * Hook to fetch a single session by ID
 */
export function useSession(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ["session", id] : null,
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
  const { data, error, isLoading, mutate } = useSWR(
    speakerId ? ["sessions", "speaker", speakerId] : null,
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
  const { data, error, isLoading, mutate } = useSWR(
    track ? ["sessions", "track", track] : null,
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
  const { data, error, isLoading, mutate } = useSWR(
    day ? ["sessions", "day", day] : null,
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
