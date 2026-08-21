"use client";

import { CircleX } from "lucide-react";
import type { FilterFacet } from "./useScheduleState";

const FACET_LABELS: Record<FilterFacet, string> = {
  track: "Tracks",
  topic: "Topics",
  room: "Locations",
  type: "Session formats",
  expertise: "Expertise",
};

/**
 * Applied-filters chip (Figma "Filter Status Bar"):
 * "Filters: Tracks (3), Locations (3)" on a lavender pill with a clear button.
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
    <button
      onClick={onClear}
      aria-label="Clear filters"
      className="flex h-9 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-[4px] border border-dc-purple bg-dc-lavender px-2 py-1 transition-colors hover:bg-dc-purple-wash"
    >
      <p className="min-w-0 truncate text-[12px] leading-none text-dc-purple">
        <span className="font-bold">Filters:</span>{" "}
        <span className="font-medium">{parts.join(", ")}</span>
      </p>
      <CircleX className="size-4 shrink-0 text-dc-purple" />
    </button>
  );
}
