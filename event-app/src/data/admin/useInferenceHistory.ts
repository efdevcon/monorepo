"use client";

import { useCallback, useEffect, useState } from "react";
import { cacheDB, type InferenceRun } from "@/data/cache/cache-db";

/** Cap the rolling history so IndexedDB doesn't grow without bound. */
const MAX_RUNS = 100;

/**
 * Local history of inference-debug runs, persisted in the Dexie `inferenceRuns`
 * table (offline-safe, roomier than localStorage for full RAG contexts).
 * Single-user, browser-local — this is a debugging aid, not synced state.
 */
export function useInferenceHistory() {
  const [runs, setRuns] = useState<InferenceRun[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (typeof window === "undefined" || !cacheDB) return;
    const all = await cacheDB.inferenceRuns
      .orderBy("timestamp")
      .reverse()
      .toArray();
    setRuns(all);
    setLoaded(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addRun = useCallback(
    async (run: InferenceRun) => {
      if (!cacheDB) return;
      await cacheDB.inferenceRuns.put(run);
      // Trim to the most-recent MAX_RUNS.
      const ids = await cacheDB.inferenceRuns
        .orderBy("timestamp")
        .reverse()
        .primaryKeys();
      if (ids.length > MAX_RUNS) {
        await cacheDB.inferenceRuns.bulkDelete(ids.slice(MAX_RUNS));
      }
      await reload();
    },
    [reload]
  );

  const removeRun = useCallback(
    async (id: string) => {
      if (!cacheDB) return;
      await cacheDB.inferenceRuns.delete(id);
      await reload();
    },
    [reload]
  );

  const clear = useCallback(async () => {
    if (!cacheDB) return;
    await cacheDB.inferenceRuns.clear();
    await reload();
  }, [reload]);

  return { runs, loaded, addRun, removeRun, clear };
}
