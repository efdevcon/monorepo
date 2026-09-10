"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { useUser } from "@/data/auth/useUser";
import { useOnline } from "@/hooks/useOnline";
import { getActiveDataset } from "@/data/dataset";
import { requestInterestSync, setSyncContext } from "./sync";

/**
 * Mounts the interests sync triggers (see sync.ts): the account context while
 * signed in, then a sync on sign-in, when the connection returns and when the
 * tab becomes visible again. Renders nothing; mount once inside UserProvider.
 * Uses the SWR config's `mutate`, since the app runs a custom cache provider
 * that the global `mutate` from "swr" does not see.
 */
export function InterestSync() {
  const { user } = useUser();
  const userId = user?.id;
  const { mutate } = useSWRConfig();
  const online = useOnline();
  const eventId = getActiveDataset().eventId;

  useEffect(() => {
    if (!userId) {
      setSyncContext(null);
      return;
    }
    setSyncContext({ userId, eventId, mutate: (key) => mutate(key) });
    requestInterestSync(0);
    const onVisible = () => {
      if (document.visibilityState === "visible") requestInterestSync(0);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      setSyncContext(null);
    };
  }, [userId, eventId, mutate]);

  useEffect(() => {
    if (online && userId) requestInterestSync(0);
  }, [online, userId]);

  return null;
}
