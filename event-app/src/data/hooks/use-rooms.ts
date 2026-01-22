import useSWR from "swr";
import { provider } from "../providers/provider";
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
    () => provider.getRoom(id),
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
