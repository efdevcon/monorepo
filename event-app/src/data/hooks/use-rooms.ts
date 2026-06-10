import useSWR from "swr";
import { provider } from "../providers/provider";
import { getActiveDatasetKey } from "../dataset";
import type { Room } from "../models";

/**
 * Fetcher function for SWR
 */
async function roomsFetcher(): Promise<Room[]> {
  return provider.getRooms();
}

/**
 * Hook to fetch all rooms
 */
export function useRooms() {
  const { data, error, isLoading, mutate } = useSWR([getActiveDatasetKey(), "rooms"], roomsFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    rooms: data ?? [],
    isLoading,
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
 * Hook to fetch a single room by ID. Derives from the cached rooms list so it
 * resolves offline once the list has loaded (the provider already implemented
 * `getRoom` by scanning `getRooms()`, but under a separate cache key — sharing
 * the list cache is what makes it offline-available).
 */
export function useRoom(id: string) {
  const { rooms, isLoading, error, mutate } = useRooms();
  const room = id ? rooms.find((r) => r.id === id) ?? null : null;

  return {
    room,
    isLoading: isLoading && !room,
    // Offline-first: don't surface an error if we have cached data to render.
    isError: room ? undefined : error,
    error: room ? undefined : error,
    mutate,
  };
}
