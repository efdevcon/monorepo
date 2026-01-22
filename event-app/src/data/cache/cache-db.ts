import Dexie, { Table } from "dexie";

interface CacheEntry {
  key: string;
  value: unknown;
  timestamp: number;
}

class CacheDB extends Dexie {
  cache!: Table<CacheEntry, string>;

  constructor() {
    super("SWRCacheDB");
    this.version(1).stores({
      cache: "&key, timestamp", // & = primary key, timestamp = index
    });
  }
}

// Only create Dexie instance in browser environment
export const cacheDB =
  typeof window !== "undefined" ? new CacheDB() : (null as unknown as CacheDB);
