"use client";

import { useEffect, useMemo, useRef } from "react";
import { Megaphone } from "lucide-react";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import { useRealWorldNowMs } from "@/hooks/useNow";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { PushOptIn } from "@/components/announcements/PushOptIn";

const dayKey = (ms: number) => new Date(ms).toDateString();

/**
 * The announcements inbox, grouped by day (Today / Yesterday / date).
 * Viewing it marks everything as seen, clearing the unread badges.
 */
export default function AnnouncementsPage() {
  const { announcements, isLoading, error, markAllSeen, readStateReady } =
    useAnnouncements();
  const nowMs = useRealWorldNowMs(60_000);

  // Unread dots reflect the read state as it was when the page was entered:
  // markAllSeen below clears the nav badge immediately, but the dots stay for
  // the whole visit so "what's new" remains visible while reading. The
  // snapshot must wait for BOTH the feed and the async Dexie read-state
  // hydration — before hydration every item reports seen=true and the dots
  // would be lost.
  const seenAtEntry = useRef<Set<string> | null>(null);
  if (seenAtEntry.current === null && !isLoading && readStateReady) {
    seenAtEntry.current = new Set(
      announcements.filter((a) => a.seen).map((a) => a.id)
    );
  }

  // Seen = it was on screen in the inbox, after the entry snapshot is taken.
  // Re-runs as new data arrives while the page is open (markAllSeen is
  // memoized on the fetched list).
  useEffect(() => {
    if (!isLoading && readStateReady) markAllSeen();
  }, [isLoading, readStateReady, markAllSeen]);

  const groups = useMemo(() => {
    const today = dayKey(nowMs);
    const yesterday = dayKey(nowMs - 24 * 60 * 60 * 1000);
    const byDay = new Map<string, typeof announcements>();
    for (const a of announcements) {
      const key = dayKey(new Date(a.sendAt).getTime());
      const label =
        key === today
          ? "Today"
          : key === yesterday
            ? "Yesterday"
            : new Date(a.sendAt).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
      const group = byDay.get(label) ?? [];
      group.push(a);
      byDay.set(label, group);
    }
    return [...byDay.entries()];
  }, [announcements, nowMs]);

  return (
    // Escape the 680px `.section` column to the 1312px desktop content box
    // (same pattern as Ticket.tsx / Schedule).
    <main className="expand py-6">
      <div className="px-4 lg:mx-auto lg:w-full lg:max-w-[1312px] lg:px-8 xl:px-0">
        {/* Mobile title comes from AppHeader (routeChrome); page h1 is desktop-only. */}
        <h1 className="mb-4 hidden font-heading text-2xl font-extrabold tracking-[-0.5px] text-dc-fg2 lg:block">
          Announcements
        </h1>

        <PushOptIn />

        {isLoading && (
          <p className="text-sm text-dc-muted">Loading announcements…</p>
        )}

        {!isLoading && error && announcements.length === 0 && (
          <p className="text-sm text-dc-muted">
            Couldn&apos;t load announcements. Check your connection and try
            again.
          </p>
        )}

        {!isLoading && !error && announcements.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-dc-border py-12 text-center">
            <Megaphone className="h-6 w-6 text-dc-muted/50" />
            <p className="text-sm text-dc-muted">
              Nothing yet — announcements from the team will show up here.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-8">
          {groups.map(([label, items]) => (
            <section key={label}>
              <h2 className="mb-3 font-heading text-xs font-bold uppercase leading-[18px] tracking-[0.5px] text-dc-muted">
                {label}
              </h2>
              <div className="flex flex-col gap-3">
                {items.map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    announcement={a}
                    seen={seenAtEntry.current?.has(a.id) ?? true}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
