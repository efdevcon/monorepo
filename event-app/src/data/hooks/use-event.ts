import useSWR from "swr";
import { provider } from "../providers/provider";
import { getActiveDatasetKey } from "../dataset";

/**
 * Hook to fetch the active event's metadata (title, start/end dates).
 * Keyed by dataset like the other hooks so switching datasets doesn't serve
 * another event's cached metadata; persisted offline via the Dexie SWR cache.
 */
export function useEvent() {
  const ds = getActiveDatasetKey();

  const { data, error, isLoading, mutate } = useSWR(
    provider.getEvent ? [ds, "event"] : null,
    () => provider.getEvent!(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    event: data,
    isLoading,
    // Offline-first: only surface an error when nothing is cached at all.
    isError: data !== undefined ? undefined : error,
    error: data !== undefined ? undefined : error,
    mutate,
  };
}
