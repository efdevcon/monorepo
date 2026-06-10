import useSWR from "swr";
import { provider } from "../providers/provider";
import { getActiveDatasetKey } from "../dataset";
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
    [getActiveDatasetKey(), "speakers"],
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
 * Hook to fetch a single speaker by ID.
 *
 * Derives from the cached speakers list rather than fetching `/speakers/:id`
 * on its own. That single network call per id meant a detail page never opened
 * while online had no cached entry and failed offline; sharing the list cache
 * makes every speaker available offline once the list has loaded once.
 */
export function useSpeaker(id: string) {
  const { speakers, isLoading, error, mutate } = useSpeakers();
  const speaker = id ? speakers.find((s) => s.id === id) ?? null : null;

  return {
    speaker,
    // Only "loading" while we have nothing to show yet.
    isLoading: isLoading && !speaker,
    // Offline-first: don't surface an error if we have cached data to render.
    isError: speaker ? undefined : error,
    error: speaker ? undefined : error,
    mutate,
  };
}

/**
 * Hook to search speakers by query string. Filters the cached list client-side
 * so search works offline too.
 */
export function useSearchSpeakers(query: string) {
  const { speakers, isLoading, error, mutate } = useSpeakers();
  const q = query.trim().toLowerCase();
  const results = q ? speakers.filter((s) => s.name.toLowerCase().includes(q)) : [];

  return {
    speakers: results,
    isLoading,
    isError: error,
    error,
    mutate,
  };
}
