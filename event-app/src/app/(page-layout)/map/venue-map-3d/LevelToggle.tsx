"use client";

import { Segmented } from "./Segmented";
import type { LevelId, PlanLevel } from "./types";

/**
 * Floor pills (G · L1 · L2) under the view switch. No pill is active while
 * every floor is stacked; tapping the active pill again returns to the stack
 * (VenueMap3D decides, so the flat view can ignore it).
 */
export function LevelToggle({ levels, value, onChange }: { levels: PlanLevel[]; value: LevelId | null; onChange: (l: LevelId) => void }) {
  return (
    <Segmented
      ariaLabel="Floor"
      value={value}
      onChange={onChange}
      // 8px under the 40px view switch (which sits 12px under the header).
      className="fixed right-4 top-[calc(3.5rem+var(--safe-top)+60px)] lg:right-6 lg:top-[128px]"
      options={levels.map((level) => ({ value: level.id, label: level.name, className: "min-w-11 px-2", children: level.label }))}
    />
  );
}
