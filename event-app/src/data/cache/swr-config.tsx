"use client";

import { SWRConfig, type Cache } from "swr";
import { ReactNode, useEffect, useState, useRef } from "react";
import { createDexieCacheProvider } from "./indexeddb-cache";
import { eventStore } from "../store/event-store";
import { getActiveDataset } from "../dataset";

/**
 * Data boot gate. Hydrates two things in parallel before rendering children:
 * the Dexie-backed SWR cache (announcements, tickets, user state) and the
 * EventStore (sessions, speakers, rooms, event). Waiting keeps the first paint
 * free of content flashes and makes it work with no network at all. Once
 * ready, the store's sync triggers start (first sync, visibility, online,
 * 60 s poll).
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const { ready, cacheProvider } = useBoot();

  useEffect(() => {
    if (!ready) return;
    return eventStore.startTriggers(getActiveDataset());
  }, [ready]);

  if (!ready) return null;

  return (
    <SWRConfig
      value={{
        dedupingInterval: 30000,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        keepPreviousData: true,
        refreshInterval: 0,
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        provider: () => cacheProvider as unknown as Cache,
      }}
    >
      {children}
    </SWRConfig>
  );
}

function useBoot() {
  const providerRef = useRef<Map<string, unknown> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { cache, initPromise } = createDexieCacheProvider();
    providerRef.current = cache;
    Promise.all([initPromise, eventStore.hydrate(getActiveDataset())]).then(
      () => setReady(true)
    );
  }, []);

  return { ready, cacheProvider: providerRef.current };
}
