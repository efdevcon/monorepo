import { cacheDB } from "./cache-db";

const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

const isBrowser = typeof window !== "undefined";

/**
 * Create an SWR-compatible cache backed by Dexie IndexedDB.
 *
 * Returns the cache Map and a promise that resolves once IndexedDB entries
 * have been loaded into memory. SWR should wait for initPromise before
 * rendering to avoid race conditions.
 */
export function createDexieCacheProvider(): {
  cache: Map<string, unknown>;
  initPromise: Promise<void>;
} {
  const memoryCache = new Map<string, unknown>();

  if (!isBrowser || !cacheDB) {
    return { cache: memoryCache, initPromise: Promise.resolve() };
  }

  // Load persisted entries into memory
  const initPromise = cacheDB.cache
    .where("timestamp")
    .above(Date.now() - MAX_CACHE_AGE)
    .toArray()
    .then((entries) => {
      entries.forEach((entry) => {
        memoryCache.set(entry.key, entry.value);
      });
    })
    .catch((error) => {
      console.warn("Failed to load cache from IndexedDB:", error);
    });

  // Override set/delete/clear to persist changes to Dexie
  const originalSet = memoryCache.set.bind(memoryCache);
  const originalDelete = memoryCache.delete.bind(memoryCache);
  const originalClear = memoryCache.clear.bind(memoryCache);

  memoryCache.set = (key: string, value: unknown) => {
    originalSet(key, value);
    cacheDB.cache
      .put({ key, value, timestamp: Date.now() })
      .catch((error) => {
        console.warn(`Failed to persist cache entry "${key}":`, error);
      });
    return memoryCache;
  };

  memoryCache.delete = (key: string) => {
    originalDelete(key);
    cacheDB.cache.delete(key).catch((error) => {
      console.warn(`Failed to delete cache entry "${key}":`, error);
    });
    return true;
  };

  memoryCache.clear = () => {
    originalClear();
    cacheDB.cache.clear().catch((error) => {
      console.warn("Failed to clear cache:", error);
    });
  };

  return { cache: memoryCache, initPromise };
}

/**
 * Cleanup old cache entries (older than MAX_CACHE_AGE)
 */
export async function cleanupOldCacheEntries(): Promise<void> {
  if (!isBrowser || !cacheDB) return;

  try {
    const cutoff = Date.now() - MAX_CACHE_AGE;
    await cacheDB.cache.where("timestamp").below(cutoff).delete();
  } catch (error) {
    console.warn("Failed to cleanup old cache entries:", error);
  }
}
