import useSWR from "swr";
import { provider } from "../providers/provider";
import type { Speaker } from "../models";

/**
 * Fetcher function for SWR
 */
async function speakersFetcher(): Promise<Speaker[]> {
  return provider.getSpeakers();
}

/**
 * Hook to fetch all speakers
 */
export function useSpeakers() {
  const { data, error, isLoading, mutate } = useSWR(
    ["speakers"],
    speakersFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    speakers: data ?? [],
    isLoading,
    isError: error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch a single speaker by ID
 */
export function useSpeaker(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ["speaker", id] : null,
    () => provider.getSpeaker(id),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    speaker: data ?? null,
    isLoading,
    isError: error,
    error,
    mutate,
  };
}

/**
 * Hook to search speakers by query string
 */
export function useSearchSpeakers(query: string) {
  const { data, error, isLoading, mutate } = useSWR(
    query ? ["speakers", "search", query] : null,
    () => provider.searchSpeakers(query),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    speakers: data ?? [],
    isLoading,
    isError: error,
    error,
    mutate,
  };
}
