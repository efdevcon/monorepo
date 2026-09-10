"use client";

import { SWRConfig, type Cache } from "swr";
import { ReactNode, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { isOnlineNow } from "@/hooks/useOnline";
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
        // No retries while the browser knows it is offline: they can only
        // fail (three more console errors per hook), and revalidateOnReconnect
        // already refetches the moment the network is back.
        onErrorRetry: (_err, _key, config, revalidate, { retryCount }) => {
          if (!isOnlineNow()) return;
          if (retryCount >= (config.errorRetryCount ?? 3)) return;
          setTimeout(() => void revalidate({ retryCount }), config.errorRetryInterval);
        },
        provider: () => cacheProvider as unknown as Cache,
      }}
    >
      {children}
    </SWRConfig>
  );
}

/**
 * Boot never blocks for long. IndexedDB can hang without failing: the same
 * app open in another tab on an older schema blocks the version upgrade
 * (Dexie "blocked"), and some private modes stall `open()` indefinitely. A
 * gate with no timeout then meant a permanent white screen. After this long
 * the app renders with whatever is in memory (an empty snapshot; the network
 * sync fills it) and says why nothing is saved.
 */
const BOOT_TIMEOUT_MS = 3_000;

function useBoot() {
  const providerRef = useRef<Map<string, unknown> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { cache, initPromise } = createDexieCacheProvider();
    providerRef.current = cache;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setReady(true);
    };
    const timer = setTimeout(() => {
      if (done) return;
      console.warn("[boot] storage did not answer in time, starting without it");
      toast.warning("Storage is busy in another tab. Close other Devcon tabs so the schedule can be saved offline.", {
        duration: 8_000,
      });
      finish();
    }, BOOT_TIMEOUT_MS);
    Promise.all([initPromise, eventStore.hydrate(getActiveDataset())])
      .catch((err) => console.warn("[boot] hydrate failed, starting empty:", err))
      .then(() => {
        clearTimeout(timer);
        finish();
      });
    return () => clearTimeout(timer);
  }, []);

  return { ready, cacheProvider: providerRef.current };
}
