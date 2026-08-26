"use client";

import cn from "classnames";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "@/routing";
import { useRealWorldNowMs } from "@/hooks/useNow";
import { resolveAnnouncementLink } from "@/data/announcements/linkUtils";
import type { Announcement } from "@/data/announcements/types";

/**
 * Relative timestamp in the redesign's long-form units ("3 mins ago",
 * "2 hrs ago", then a date). Future times ("In 10 mins") appear only in
 * ?preview mode, where editors check scheduled announcements.
 */
function relativeTime(sendAt: string, nowMs: number): string {
  const diffMs = nowMs - new Date(sendAt).getTime();
  const abs = Math.abs(diffMs);
  const minutes = Math.floor(abs / 60_000);
  const hours = Math.floor(abs / 3_600_000);
  // Pluralize from the value actually displayed.
  const unit = (n: number, u: string) => `${n} ${u}${n === 1 ? "" : "s"}`;

  if (diffMs < 0) {
    if (minutes < 60) return `In ${unit(Math.max(minutes, 1), "min")}`;
    if (hours < 24) return `In ${unit(hours, "hr")}`;
  } else {
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${unit(minutes, "min")} ago`;
    if (hours < 24) return `${unit(hours, "hr")} ago`;
  }
  return new Date(sendAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Generic CTA per the redesign: internal links → "Open →", external → "Open ↗".
 *  (Custom labels would need a CTA column in the Notion pipeline — not yet.) */
function Cta({ external, mini }: { external: boolean; mini?: boolean }) {
  const Icon = external ? ArrowUpRight : ArrowRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-heading font-bold text-dc-purple",
        // Underline while the (linked) card is hovered, reinforcing the CTA.
        "underline-offset-2 group-hover:underline",
        mini ? "text-xs" : "text-sm"
      )}
    >
      Open <Icon className={mini ? "size-3.5" : "size-4"} />
    </span>
  );
}

function UnreadDot() {
  return (
    <span
      className="size-2 shrink-0 rounded-full bg-dc-purple"
      aria-label="Unread"
    />
  );
}

/**
 * One announcement, in either of the redesign's two shapes:
 * - "inbox" (default, /announcements): date/unread dot top-right in the title
 *   row, CTA bottom-left.
 * - "home" (home preview grid): meta row at the card's bottom — dot + time on
 *   the left, CTA on the right; equal-height across the 3-up grid.
 */
export function AnnouncementCard({
  announcement,
  seen,
  variant = "inbox",
}: {
  announcement: Announcement;
  seen: boolean;
  variant?: "inbox" | "home";
}) {
  const nowMs = useRealWorldNowMs(60_000);
  const { title, message, url, sendAt } = announcement;
  const link = url ? resolveAnnouncementLink(url) : null;
  const external = !!link?.external;
  const time = relativeTime(sendAt, nowMs);

  // Linked cards get a purple border + CTA underline (`group`) on hover;
  // cards without a url stay fully inert. Only the home-preview variant also
  // scales/shadows like the other home cards — the inbox stays still.
  const interactive = cn(
    "group transition-[scale,box-shadow,border-color] duration-150 ease-out hover:border-dc-purple/40",
    variant === "home" &&
      "hover:shadow-sm motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]"
  );

  const body =
    variant === "home" ? (
      <div
        className={cn(
          "flex h-full flex-col justify-between gap-3 rounded-lg border border-dc-hairline bg-white p-4",
          link && interactive
        )}
      >
        <div>
          <p className="font-heading text-sm font-bold leading-5 text-dc-fg2">
            {title}
          </p>
          {message && (
            <p className="mt-2 whitespace-pre-line font-heading text-sm leading-5 text-dc-fg2">
              {message}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {!seen && <UnreadDot />}
            <span className="font-heading text-xs leading-4 text-dc-muted">
              {time}
            </span>
          </span>
          {link && <Cta external={external} mini />}
        </div>
      </div>
    ) : (
      <div
        className={cn(
          "rounded-lg border border-dc-hairline bg-white p-4",
          link && interactive
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 font-heading text-base font-bold leading-6 text-dc-fg2">
            {title}
          </p>
          <span className="flex shrink-0 items-center gap-2">
            {!seen && <UnreadDot />}
            <span className="font-heading text-xs leading-4 text-dc-muted">
              {time}
            </span>
          </span>
        </div>
        {message && (
          <p className="mt-2 whitespace-pre-line font-heading text-sm leading-5 text-dc-fg2">
            {message}
          </p>
        )}
        {link && (
          <div className="mt-4">
            <Cta external={external} />
          </div>
        )}
      </div>
    );

  if (!link) return body;

  const linkClass = cn(
    "block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple",
    variant === "home" && "h-full"
  );

  // Internal paths navigate in-app; anything else opens a new tab.
  if (!link.external) {
    return (
      <Link href={link.href} className={linkClass}>
        {body}
      </Link>
    );
  }
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClass}
    >
      {body}
    </a>
  );
}
