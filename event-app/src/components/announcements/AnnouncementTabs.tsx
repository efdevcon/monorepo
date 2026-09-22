"use client";

import cn from "classnames";

export type InboxTab = "event" | "personal";

const TABS: { key: InboxTab; label: string }[] = [
  { key: "event", label: "Event" },
  { key: "personal", label: "Personal" },
];

/**
 * Event / Personal switch at the top of the announcements inbox: the
 * speakers page's underline tabs (TypeTabs) with the schedule day tabs'
 * purple count badge, here showing each tab's unread count. The strip it
 * sits in (full-bleed lavender on mobile, the card's white header row on
 * desktop) belongs to the page.
 */
export function AnnouncementTabs({
  selected,
  onSelect,
  counts,
}: {
  selected: InboxTab;
  onSelect: (tab: InboxTab) => void;
  /** Unread count per tab; a badge shows only when it is above zero. */
  counts: Record<InboxTab, number>;
}) {
  return (
    <div
      role="group"
      aria-label="Announcement type"
      className="flex min-w-0 items-stretch gap-3"
    >
      {TABS.map(({ key, label }) => {
        const active = key === selected;
        const count = counts[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={active}
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 px-2 py-4 text-[14px] leading-none transition-colors lg:min-h-9 lg:px-3 lg:py-1",
              active
                ? "border-dc-purple font-bold text-dc-purple"
                : "border-transparent font-normal text-dc-fg2 hover:text-dc-purple"
            )}
          >
            {label}
            {/* -my-0.5: the 16px pill must not grow the 14px text row, or
                the list below nudges when a tab is read and the badge goes. */}
            {count > 0 && (
              <span
                className="-my-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-dc-purple px-1 text-[10px] font-semibold leading-none tabular-nums text-white"
                aria-label={`${count} unread`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
