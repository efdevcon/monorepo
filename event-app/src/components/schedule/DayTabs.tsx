"use client";

import { usePaneActive } from "@/components/paneContext";
import { useEffect, useRef, useState } from "react";
import cn from "classnames";
import { headerOffsetNow } from "@/hooks/useIsDesktop";
import type { ScheduleDay } from "./utils";

/** "Tue, Nov 3" → "Nov 3" for the compact mobile tabs. */
const shortLabel = (label: string) => label.split(", ")[1] ?? label;

/**
 * Day selector bar (Figma): underline tabs — full labels on desktop plus a
 * right-hand controls slot (Interested / Jump to now / Filter); mobile shows
 * short labels in a left-packed scrollable row behind a right-edge fade
 * (full-bleed, like the topic pills); mid-search each tab carries its match
 * count and matchless days are left out. Sticks under the app header on both
 * breakpoints (56px mobile bar, 65px desktop nav) so the day switcher and
 * controls stay reachable mid-list; time-group headers pin beneath it.
 * Lavender strip at rest on both breakpoints; mobile keeps it while pinned
 * (unified with the speakers format tabs), while desktop swaps to the app
 * header's glass recipe (white/75 + 4px backdrop blur) once pinned so cards
 * scroll past behind it. `raised` (mobile timeline, app header folded away)
 * pins the bar at the very top instead, its own padding covering the iOS
 * status-bar strip the header used to.
 */
export function DayTabs({
  days,
  selectedDay,
  onSelect,
  children,
  pinnedLead,
  counts,
  raised = false,
  trailing,
}: {
  days: ScheduleDay[];
  selectedDay: string | null;
  onSelect: (key: string) => void;
  /**
   * Per-day match counts while a search is active (null/undefined: no
   * badges). The host passes only the days present in the map, so a badge
   * never reads "0".
   */
  counts?: ReadonlyMap<string, number> | null;
  /** Desktop-only right-hand controls. */
  children?: React.ReactNode;
  /** Desktop-only control ahead of `children`, shown once the bar is pinned. */
  pinnedLead?: React.ReactNode;
  /**
   * Mobile-only control past the tabs' right fade, shown once the bar is
   * pinned (the schedule's compact programme switch: the full one sits in
   * flow above the bar and has scrolled away by then).
   */
  trailing?: React.ReactNode;
  /** Mobile: the app header is hidden — pin at the top of the viewport. */
  raised?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);
  // Hidden tab panes must not measure on every scroll of another tab.
  const paneActive = usePaneActive();

  // Pinned under the app header? (rAF-throttled; sticky clamps rect.top at
  // the offset, so <= offset+1 means stuck.)
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

  if (days.length === 0) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "sticky z-20 flex items-stretch justify-between border-b border-dc-hairline bg-dc-lavender lg:top-[calc(65px+var(--safe-top))] lg:items-center lg:px-4 lg:py-2",
        // The raise animates on the app header's clock (AppHeader.tsx).
        "transition-[top,padding-top] duration-200 ease-out motion-reduce:transition-none",
        raised
          ? "top-0 pt-[var(--safe-top)]"
          : "top-[calc(3.5rem+var(--safe-top))]",
        // Desktop: soft lavender at rest → header glass once pinned.
        stuck && "lg:bg-white/75 lg:backdrop-blur-[4px]"
      )}
    >
      {/* Mobile: the tabs scroll behind a right-edge fade — an abruptly cut
          tab reads as "no more days" (like the speakers topic pills). The
          fade belongs to the scroll region, so `trailing` sits past it. */}
      <div className="relative flex min-w-0 flex-1 lg:flex-initial">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-dc-lavender to-transparent lg:hidden" />
        {/* overflow-x-auto + shrink-0 tabs: with many days or a narrow phone
            the bar must scroll — a packed row would clip later days without
            the fade. */}
        <div className="flex min-w-0 flex-1 items-stretch justify-start gap-3 overflow-x-auto pl-4 pr-12 lg:flex-initial lg:items-center lg:gap-3 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map((day) => {
            const active = day.key === selectedDay;
            return (
              <button
                key={day.key}
                onClick={() => onSelect(day.key)}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 px-2 py-4 text-[14px] leading-none transition-colors lg:min-h-9 lg:px-3 lg:py-1",
                  active
                    ? "border-dc-purple font-bold text-dc-purple"
                    : "border-transparent font-normal text-dc-fg2 hover:text-dc-purple"
                )}
              >
                <span className="lg:hidden">{shortLabel(day.label)}</span>
                <span className="hidden lg:inline">{day.label}</span>
                {/* Search result count (the header's unread-pill recipe at a
                    fixed 16px; auto width so three digits don't overflow).
                    Purple, not the red "filters applied" badge. */}
                {counts && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-dc-purple px-1 text-[10px] font-semibold leading-none tabular-nums text-white">
                    {counts.get(day.key) ?? 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {stuck && trailing && (
        <div className="flex shrink-0 items-center pr-4 lg:hidden">{trailing}</div>
      )}
      {children && (
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {stuck && pinnedLead}
          {children}
        </div>
      )}
    </div>
  );
}
