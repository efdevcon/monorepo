"use client";

import { CircleX } from "lucide-react";
import type { FilterFacet } from "./useScheduleState";

const FACET_LABELS: Record<FilterFacet, string> = {
  track: "Tracks",
  room: "Locations",
  type: "Session formats",
  expertise: "Expertise",
};

/**
 * Applied-filters chip (Figma "Filter Status Bar"):
 * "Filter: Tracks (3), Locations (3)" on a lavender pill with a clear button.
 */
export function FilterStatusBar({
  counts,
  onClear,
}: {
  counts: Partial<Record<FilterFacet, number>>;
  onClear: () => void;
}) {
  const parts = (Object.keys(FACET_LABELS) as FilterFacet[])
    .filter((f) => (counts[f] ?? 0) > 0)
    .map((f) => `${FACET_LABELS[f]} (${counts[f]})`);

  if (parts.length === 0) return null;

  return (
    <div className="flex h-9 min-w-0 items-center gap-2 rounded-[4px] border border-dc-purple bg-dc-lavender px-2 py-1">
      <p className="min-w-0 truncate text-[12px] leading-none text-dc-purple">
        <span className="font-bold">Filter:</span>{" "}
        <span className="font-medium">{parts.join(", ")}</span>
      </p>
      <button
        onClick={onClear}
        aria-label="Clear filters"
        className="shrink-0 cursor-pointer"
      >
        <CircleX className="size-4 text-dc-purple" />
      </button>
    </div>
  );
}
