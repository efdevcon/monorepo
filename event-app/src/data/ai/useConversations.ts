"use client";

import { useCallback, useEffect, useState } from "react";
import { cacheDB, type Conversation } from "@/data/cache/cache-db";

/** Cap the rolling history so IndexedDB doesn't grow without bound. */
const MAX_CONVERSATIONS = 100;

/**
 * Local history of Deva chatbot conversations, persisted in the Dexie
 * `conversations` table (offline-safe). Ordered most-recently-updated first so
 * the bot can resume the latest chat and list past ones to revisit.
 * Browser-local, single-user — not synced.
 */
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (typeof window === "undefined" || !cacheDB) return;
    const all = await cacheDB.conversations
      .orderBy("updatedAt")
      .reverse()
      .toArray();
    setConversations(all);
    setLoaded(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (conversation: Conversation) => {
      if (!cacheDB) return;
      await cacheDB.conversations.put(conversation);
      // Trim to the most-recent MAX_CONVERSATIONS.
      const ids = await cacheDB.conversations
        .orderBy("updatedAt")
        .reverse()
        .primaryKeys();
      if (ids.length > MAX_CONVERSATIONS) {
        await cacheDB.conversations.bulkDelete(ids.slice(MAX_CONVERSATIONS));
      }
      await reload();
    },
    [reload]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!cacheDB) return;
      await cacheDB.conversations.delete(id);
      await reload();
    },
    [reload]
  );

  const clear = useCallback(async () => {
    if (!cacheDB) return;
    await cacheDB.conversations.clear();
    await reload();
  }, [reload]);

  return { conversations, loaded, save, remove, clear };
}
