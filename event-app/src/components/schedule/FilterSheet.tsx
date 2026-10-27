"use client";

import { BottomSheet } from "@/components/BottomSheet";
import type { FilterFacet, Filters } from "./useScheduleState";
import { FilterPanelContent, type FilterPanelMode } from "./FilterPanelContent";
import type { CommunityRef } from "@/data/programme";

/** Mobile filter bottom sheet: the shared BottomSheet shell around the
 *  schedule's filter panel. Desktop shows the same content as a side column. */
export function FilterSheet({
  open,
  onOpenChange,
  options,
  filters,
  onToggle,
  onClear,
  mode,
  communities,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: Record<FilterFacet, string[]>;
  filters: Filters;
  onToggle: (facet: FilterFacet, value: string) => void;
  onClear: () => void;
  mode?: FilterPanelMode;
  communities?: CommunityRef[];
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} ariaLabel="Filters">
      <FilterPanelContent
        options={options}
        filters={filters}
        onToggle={onToggle}
        onClear={onClear}
        onClose={() => onOpenChange(false)}
        mode={mode}
        communities={communities}
      />
    </BottomSheet>
  );
}
