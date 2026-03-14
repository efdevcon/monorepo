"use client";

import { SWRConfig, type Cache } from "swr";
import { ReactNode, useEffect, useState, useRef } from "react";
import { createDexieCacheProvider } from "./indexeddb-cache";

/**
 * Custom SWR configuration with:
 * - Extended deduplication interval (30 seconds)
 * - Stale-while-revalidate enabled (default)
 * - IndexedDB persistence via Dexie for offline support (supports large datasets)
 *
 * Waits for IndexedDB cache to initialize before rendering children,
 * preventing a race condition where Dexie's async init overwrites SWR's state.
 */
export function SWRConfigProvider({ children }: { children: ReactNode }) {
  const { cacheReady, cacheProvider } = useDexieCache();

  if (!cacheReady) return null;

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

function useDexieCache() {
  const providerRef = useRef<Map<string, unknown> | null>(null);
  const [cacheReady, setCacheReady] = useState(false);

  useEffect(() => {
    const { cache, initPromise } = createDexieCacheProvider();
    providerRef.current = cache;

    initPromise.then(() => setCacheReady(true));
  }, []);

  return { cacheReady, cacheProvider: providerRef.current };
}
