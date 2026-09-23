import { cacheDB } from "@/data/cache/cache-db";

/**
 * Device-local preferences in the Dexie `prefs` table (one row per key), for
 * state that must display offline and survive restarts but is not worth an
 * SWR entry: e.g. the notification switches' last known values. Browser-only
 * and best-effort like every other Dexie call here: a read resolves
 * undefined and a write is dropped when storage is unavailable (SSR, private
 * mode, a blocked upgrade), so callers keep working memory-only.
 */
export async function readPref<T>(key: string): Promise<T | undefined> {
  if (!cacheDB) return undefined;
  try {
    return (await cacheDB.prefs.get(key))?.value as T | undefined;
  } catch {
    return undefined;
  }
}

export async function writePref(key: string, value: unknown): Promise<void> {
  if (!cacheDB) return;
  try {
    await cacheDB.prefs.put({ key, value });
  } catch {}
}
