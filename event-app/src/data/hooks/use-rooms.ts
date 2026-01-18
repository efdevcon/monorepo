import useSWR from "swr";
import { adapter } from "../providers/adapter";
import type { Room } from "../models";

/**
 * Fetcher function for SWR
 */
async function roomsFetcher(): Promise<Room[]> {
  return adapter.getRooms();
}

/**
 * Hook to fetch all rooms
 */
export function useRooms() {
  const { data, error, isLoading, mutate } = useSWR(["rooms"], roomsFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    rooms: data ?? [],
    isLoading,
    isError: error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch a single room by ID
 */
export function useRoom(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ["room", id] : null,
    () => adapter.getRoom(id),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    room: data ?? null,
    isLoading,
    isError: error,
    error,
    mutate,
  };
}
