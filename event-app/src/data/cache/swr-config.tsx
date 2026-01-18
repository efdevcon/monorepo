"use client";

import { SWRConfig, type Cache } from "swr";
import { ReactNode, useRef } from "react";
import { createDexieCacheProvider } from "./indexeddb-cache";

/**
 * Custom SWR configuration with:
 * - Extended deduplication interval (30 seconds)
 * - Stale-while-revalidate enabled (default)
 * - IndexedDB persistence via Dexie for offline support (supports large datasets)
 */
export function SWRConfigProvider({ children }: { children: ReactNode }) {
  const providerRef = useRef<Cache | null>(null);

  if (!providerRef.current) {
    providerRef.current = createDexieCacheProvider()();
  }

  return (
    <SWRConfig
      value={{
        // Extended deduplication: prevent duplicate requests for 30 seconds
        dedupingInterval: 30000, // 30 seconds (default is 2 seconds)

        // Stale-while-revalidate: show cached data immediately, fetch fresh in background
        revalidateOnFocus: false, // Don't revalidate when window regains focus
        revalidateOnReconnect: true, // Revalidate when network reconnects
        revalidateIfStale: true, // Revalidate stale data on mount

        // Cache settings
        keepPreviousData: true, // Keep previous data while fetching new data
        refreshInterval: 0, // Disable automatic polling (set > 0 to enable)

        // Error handling
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000,

        // Use Dexie-backed IndexedDB cache provider
        provider: () => providerRef.current!,
      }}
    >
      {children}
    </SWRConfig>
  );
}
