"use client";

import { useEffect, useRef, useState } from "react";
import cn from "classnames";
import { usePaneActive } from "@/components/paneContext";
import { headerOffsetNow } from "@/hooks/useIsDesktop";

export type InboxTab = "event" | "personal";

const TABS: { key: InboxTab; label: string }[] = [
  { key: "event", label: "Event" },
  { key: "personal", label: "Personal" },
];

/**
 * Event / Personal strip at the top of the announcements inbox: the speakers
 * page's underline tabs (TypeTabs) with the schedule day tabs' purple count
 * badge, here showing each tab's unread count, plus a right-hand slot for
 * the Notifications settings link. Same chrome as DayTabs / TypeTabs: sticks
 * under the app header on both breakpoints (56px mobile bar, 65px desktop
 * nav) so the switch stays reachable mid-list; lavender at rest, and on
 * desktop the app header's glass (white/75 + 4px blur, corners squared) once
 * pinned so cards scroll past behind it.
 */
export function AnnouncementTabs({
  selected,
  onSelect,
  counts,
  children,
}: {
  selected: InboxTab;
  onSelect: (tab: InboxTab) => void;
  /** Unread count per tab; a badge shows only when it is above zero. */
  counts: Record<InboxTab, number>;
  /** Right-hand controls (the Notifications settings link). */
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);
  const paneActive = usePaneActive();

  // Pinned under the app header? (rAF-throttled; sticky clamps rect.top at
  // the offset, so <= offset+1 means stuck.) Same loop as DayTabs.
  useEffect(() => {
    if (!paneActive) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      setStuck(el.getBoundingClientRect().top <= headerOffsetNow() + 1);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [paneActive]);

  return (
    <div
      ref={ref}
      className={cn(
        "sticky top-[calc(3.5rem+var(--safe-top))] z-20 flex items-stretch justify-between gap-3 border-b border-dc-hairline bg-dc-lavender px-4 lg:top-[calc(65px+var(--safe-top))] lg:items-center lg:py-2",
        // Desktop: the card's rounded lavender top at rest → header glass,
        // corners squared, once pinned.
        stuck ? "lg:bg-white/75 lg:backdrop-blur-[4px]" : "lg:rounded-t-xl"
      )}
    >
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
      {children && (
        <div className="flex shrink-0 items-center gap-3">{children}</div>
      )}
    </div>
  );
}
