"use client";

import cn from "classnames";
import type { ScheduleDay } from "./utils";

/** Horizontal, scrollable day selector. */
export function DayTabs({
  days,
  selectedDay,
  onSelect,
}: {
  days: ScheduleDay[];
  selectedDay: string | null;
  onSelect: (key: string) => void;
}) {
  if (days.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {days.map((day) => (
        <button
          key={day.key}
          onClick={() => onSelect(day.key)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            day.key === selectedDay
              ? "border-[#7D52F4] bg-[#7D52F4] text-white"
              : "border-[#E1E4EA] text-gray-600 hover:bg-[#f3eeff]"
          )}
        >
          {day.label}
        </button>
      ))}
    </div>
  );
}
