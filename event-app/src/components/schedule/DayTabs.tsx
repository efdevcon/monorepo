"use client";

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
 * (full-bleed, like the topic pills). Sticks under the app header on both
 * breakpoints (56px mobile bar, 65px desktop nav) so the day switcher and
 * controls stay reachable mid-list; time-group headers pin beneath it.
 * Lavender strip at rest on both breakpoints; mobile keeps it while pinned
 * (unified with the speakers format tabs), while desktop swaps to the app
 * header's glass recipe (white/75 + 4px backdrop blur) once pinned so cards
 * scroll past behind it.
 */
export function DayTabs({
  days,
  selectedDay,
  onSelect,
  children,
}: {
  days: ScheduleDay[];
  selectedDay: string | null;
  onSelect: (key: string) => void;
  /** Desktop-only right-hand controls. */
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);

  // Pinned under the app header? (rAF-throttled; sticky clamps rect.top at
  // the offset, so <= offset+1 means stuck.)
  useEffect(() => {
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
  }, []);

  if (days.length === 0) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "sticky top-[calc(3.5rem+var(--safe-top))] z-20 flex items-stretch justify-between border-b border-dc-hairline bg-dc-lavender lg:top-[calc(65px+var(--safe-top))] lg:items-center lg:px-4 lg:py-2",
        // Desktop: soft lavender at rest → header glass once pinned.
        stuck && "lg:bg-white/75 lg:backdrop-blur-[4px]"
      )}
    >
      {/* Mobile: full-bleed scroll behind a right-edge fade — an abruptly cut
          tab reads as "no more days" (like the speakers topic pills). */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-dc-lavender to-transparent lg:hidden" />
      {/* overflow-x-auto + shrink-0 tabs: with many days or a narrow phone the
          bar must scroll — a packed row would clip later days without the fade. */}
      <div className="flex min-w-0 flex-1 items-stretch justify-start gap-3 overflow-x-auto pl-4 pr-12 lg:flex-initial lg:items-center lg:gap-3 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((day) => {
          const active = day.key === selectedDay;
          return (
            <button
              key={day.key}
              onClick={() => onSelect(day.key)}
              className={cn(
                "flex shrink-0 cursor-pointer items-center whitespace-nowrap border-b-2 px-2 py-4 text-[14px] leading-none transition-colors lg:min-h-9 lg:px-3 lg:py-1",
                active
                  ? "border-dc-purple font-bold text-dc-purple"
                  : "border-transparent font-normal text-dc-fg2 hover:text-dc-purple"
              )}
            >
              <span className="lg:hidden">{shortLabel(day.label)}</span>
              <span className="hidden lg:inline">{day.label}</span>
            </button>
          );
        })}
      </div>
      {children && (
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {children}
        </div>
      )}
    </div>
  );
}
