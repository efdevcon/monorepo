"use client";

import cn from "classnames";
import type { ScheduleDay } from "./utils";

/** "Tue, Nov 3" → "Nov 3" for the compact mobile tabs. */
const shortLabel = (label: string) => label.split(", ")[1] ?? label;

/**
 * Day selector bar (Figma): lavender strip with underline tabs — full labels
 * on desktop plus a right-hand controls slot (Interested / Jump to now /
 * Filter), short labels spread edge-to-edge on mobile. Sticks under the 56px
 * app header on mobile.
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
  if (days.length === 0) return null;

  return (
    <div className="sticky top-14 z-20 flex items-stretch justify-between border-b border-dc-hairline bg-dc-lavender px-4 lg:static lg:items-center lg:py-2">
      {/* overflow-x-auto + shrink-0 tabs: with many days or a narrow phone the
          bar must scroll — a bare justify-between row clips later days. */}
      <div className="flex min-w-0 flex-1 items-stretch justify-between overflow-x-auto lg:flex-initial lg:items-center lg:justify-start lg:gap-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  : "border-transparent font-medium text-dc-fg2 hover:text-dc-purple"
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
