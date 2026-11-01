"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import cn from "classnames";
import { unstable_serialize, useSWRConfig } from "swr";
import { cacheDB } from "@/data/cache/cache-db";
import { adminFetch } from "@/data/admin/useDatasetOverview";
import type { AnnouncementsStatus, UpcomingAnnouncement } from "@/data/announcements/types";
import { quietPill } from "./DebugTools";

/** The SWR key useAnnouncements uses for the published feed (see that hook). */
const FEED_KEY = ["announcements", "published"] as const;

// Stored timestamps, not "now": plain viewer-local formatting (announcements
// are real-world-dated and intentionally viewer-local, see CLAUDE.md).
const fmtTime = (ms: number | null) => (ms ? new Date(ms).toLocaleTimeString() : "never");
const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const TEST_WORDS: Record<string, string> = {
  scheduled: "test waiting",
  sending: "test sending",
  sent: "test sent",
};

function describe(u: UpcomingAnnouncement): string {
  const parts = [fmtWhen(u.sendAt), u.visible ? "visible" : "hidden"];
  if (!u.push) parts.push("inbox only");
  else parts.push(u.status === "scheduled" ? "push armed" : "push ticked, not armed");
  for (const [audience, status] of Object.entries(u.tests)) {
    const word = TEST_WORDS[status];
    if (word) parts.push(`${word} (${audience === "team" ? "team" : "product team"})`);
  }
  return parts.join(" · ");
}

/**
 * EF internal tools row: the announcements feed's sync state. Server side
 * (GET /api/announcements/status, @ethereum.org): when the Notion sync last
 * wrote the table, a version to compare devices by, and the rows dated after
 * now with the flags an editor checks. Device side: when this device last
 * fetched the published feed, read from the Dexie SWR cache entry's write
 * time. "Sync from Notion" is the editors' Publish link (sync + CDN purge),
 * followed by a refetch here so the readout and the inbox update together.
 * Upcoming is judged on real time, not the mock clock.
 */
export function AnnouncementsTools() {
  const [status, setStatus] = useState<AnnouncementsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { mutate } = useSWRConfig();

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminFetch("/api/announcements/status");
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? (res.status === 401 ? "Not signed in." : `HTTP ${res.status}`));
      }
      setStatus(json.data as AnnouncementsStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the announcements status");
    }
    try {
      const entry = await cacheDB?.cache.get(unstable_serialize([...FEED_KEY]));
      setFetchedAt(entry?.timestamp ?? null);
    } catch {
      setFetchedAt(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const syncNow = async () => {
    setSyncing(true);
    setError(null);
    try {
      // JSON mode of the Publish link (an HTML accept header gets the page).
      const res = await fetch("/api/announcements/refresh", { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`Sync failed (HTTP ${res.status})`);
      await mutate([...FEED_KEY]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mt-3 rounded-md border border-dc-hairline bg-white p-3 text-[12px] leading-4 text-dc-muted">
      <p className="text-[14px] leading-5 text-dc-fg2">
        Feed version:{" "}
        <span className="font-semibold">{status ? (status.version ?? "none") : error ? "unknown" : "…"}</span>
      </p>
      <p>
        synced from Notion: {status ? fmtTime(status.syncedAt ? Date.parse(status.syncedAt) : null) : "…"} · rows:{" "}
        {status?.count ?? "?"} · this device fetched: {fmtTime(fetchedAt)}
      </p>
      {status &&
        (status.upcoming.length === 0 ? (
          <p className="mt-2">Nothing dated after now.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {status.upcoming.map((u) => (
              <li key={u.id}>
                <span className="text-[14px] leading-5 font-semibold text-dc-fg2">{u.title}</span>
                <span className="block">{describe(u)}</span>
              </li>
            ))}
          </ul>
        ))}
      {error && <p className="mt-1 text-dc-error">{error}</p>}
      <button
        type="button"
        onClick={() => void syncNow()}
        disabled={syncing}
        className={cn(quietPill, "mt-2", syncing && "opacity-60")}
      >
        <RefreshCw className={cn("size-3.5 text-dc-purple", syncing && "animate-spin")} />
        {syncing ? "Syncing…" : "Sync from Notion"}
      </button>
    </div>
  );
}
