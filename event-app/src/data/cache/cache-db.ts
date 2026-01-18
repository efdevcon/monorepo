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

export const cacheDB = new CacheDB();
