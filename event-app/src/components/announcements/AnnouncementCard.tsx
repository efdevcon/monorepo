"use client";

import cn from "classnames";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/routing";
import { useRealWorldNowMs } from "@/hooks/useNow";
import type { Announcement } from "@/data/announcements/types";

/**
 * Compact relative timestamp ("Just now", "5m ago", "3h ago", then a date).
 * Future times ("In 10m") appear only in ?preview mode, where editors check
 * scheduled announcements.
 */
function relativeTime(sendAt: string, nowMs: number): string {
  const diffMs = nowMs - new Date(sendAt).getTime();
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);

  if (diffMs < 0) {
    if (minutes < 60) return `In ${Math.max(minutes, 1)}m`;
    if (hours < 24) return `In ${hours}h`;
  } else {
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
  }
  return new Date(sendAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function AnnouncementCard({
  announcement,
  seen,
}: {
  announcement: Announcement;
  seen: boolean;
}) {
  const nowMs = useRealWorldNowMs(60_000);
  const { title, message, url, sendAt } = announcement;

  const body = (
    <div
      className={cn(
        "rounded-2xl border border-[#E1E4EA] bg-white p-4 transition-colors",
        url && "hover:border-[#7D52F4]/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          {!seen && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-[#7D52F4]"
              aria-label="Unread"
            />
          )}
          {title}
        </p>
        <span className="shrink-0 text-xs text-gray-400">
          {relativeTime(sendAt, nowMs)}
        </span>
      </div>
      {message && (
        <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
          {message}
        </p>
      )}
      {url && (
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#7D52F4]">
          Open <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );

  if (!url) return body;

  // Internal paths navigate in-app; anything absolute opens a new tab.
  if (url.startsWith("/")) {
    return <Link href={url}>{body}</Link>;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {body}
    </a>
  );
}
