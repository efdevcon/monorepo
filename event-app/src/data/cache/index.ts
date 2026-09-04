// Data boot gate (SWR cache + EventStore hydration)
export { DataProvider } from "./swr-config";

// Export Dexie cache provider for monitoring/debugging
export {
  createDexieCacheProvider,
  cleanupOldCacheEntries,
} from "./indexeddb-cache";
export { cacheDB } from "./cache-db";
