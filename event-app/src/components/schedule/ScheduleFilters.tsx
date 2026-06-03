"use client";

import cn from "classnames";
import { Check } from "lucide-react";
import type { FilterFacet, Filters } from "./useScheduleState";

const FACET_LABELS: Record<FilterFacet, string> = {
  track: "Track",
  type: "Type",
  room: "Room",
  expertise: "Expertise",
};

/** Collapsible panel of multi-select filter chips, one section per facet. */
export function ScheduleFilters({
  options,
  filters,
  onToggle,
  onClear,
  activeCount,
}: {
  options: Record<FilterFacet, string[]>;
  filters: Filters;
  onToggle: (facet: FilterFacet, value: string) => void;
  onClear: () => void;
  activeCount: number;
}) {
  const facets = (Object.keys(FACET_LABELS) as FilterFacet[]).filter(
    (f) => options[f].length > 0
  );

  return (
    <div className="rounded-xl border border-[#E1E4EA] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold">Filters</span>
        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-[#7D52F4] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-4">
        {facets.map((facet) => (
          <div key={facet}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[#939393]">
              {FACET_LABELS[facet]}
            </p>
            <div className="flex flex-wrap gap-2">
              {options[facet].map((value) => {
                const active = filters[facet].includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => onToggle(facet, value)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
                      active
                        ? "border-[#7D52F4] bg-[#f3eeff] text-[#7D52F4]"
                        : "border-[#E1E4EA] text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5" />}
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
