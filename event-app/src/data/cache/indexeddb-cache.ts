import type { Cache } from "swr";
import { cacheDB } from "./cache-db";

const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if we're in a browser environment
 */
const isBrowser = typeof window !== "undefined";

/**
 * Create an SWR-compatible cache provider using Dexie for IndexedDB persistence
 * Uses a hybrid approach: memory cache for fast reads, Dexie for persistence
 * Falls back to memory-only cache on server (SSR)
 */
export function createDexieCacheProvider(): () => Cache<any> {
  const memoryCache = new Map<string, any>();

  // SSR: return simple memory cache
  if (!isBrowser || !cacheDB) {
    return () => memoryCache;
  }

  let initialized = false;

  // Load from Dexie on init (browser only)
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

  return () => {
    // Start initialization if not already started
    if (!initialized) {
      initialized = true;
      initPromise.catch(console.warn);
    }

    // Override Map methods to sync with Dexie
    const originalSet = memoryCache.set.bind(memoryCache);
    const originalDelete = memoryCache.delete.bind(memoryCache);
    const originalClear = memoryCache.clear.bind(memoryCache);

    // Override set to persist to Dexie
    memoryCache.set = (key: string, value: unknown) => {
      originalSet(key, value);
      // Persist to Dexie (non-blocking)
      cacheDB.cache
        .put({
          key,
          value,
          timestamp: Date.now(),
        })
        .catch((error) => {
          console.warn(`Failed to persist cache entry "${key}":`, error);
        });
      return memoryCache;
    };

    // Override delete to remove from Dexie
    memoryCache.delete = (key: string) => {
      originalDelete(key);
      // Remove from Dexie (non-blocking)
      cacheDB.cache.delete(key).catch((error) => {
        console.warn(`Failed to delete cache entry "${key}":`, error);
      });
      return true;
    };

    // Override clear to clear Dexie
    memoryCache.clear = () => {
      originalClear();
      // Clear Dexie (non-blocking)
      cacheDB.cache.clear().catch((error) => {
        console.warn("Failed to clear cache:", error);
      });
    };

    return memoryCache;
  };
}

/**
 * Cleanup old cache entries (older than MAX_CACHE_AGE)
 * Can be called periodically or on app startup
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
