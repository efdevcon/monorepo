"use client";

import { Segmented } from "./Segmented";
import type { LevelId, PlanLevel } from "./types";

/** Keyboard shortcut per floor (useMapShortcuts), shown in the pill tooltip. */
const LEVEL_SHORTCUT: Record<LevelId, string> = { G: "G", L1: "1", L2: "2" };

/** Segment value for the stacked view (`level === null`). */
const ALL = "all";
type LevelValue = LevelId | typeof ALL;

/**
 * Floor pills (All · G · L1 · L2) under the view switch. "All" is active while
 * every floor is stacked (Scott: the stack needs a visible state even with the
 * shortcuts); tapping the active floor pill again also returns to the stack
 * (VenueMap3D decides, so the flat view can ignore it).
 */
export function LevelToggle({ levels, value, onChange, onAll }: { levels: PlanLevel[]; value: LevelId | null; onChange: (l: LevelId) => void; onAll: () => void }) {
  return (
    <Segmented<LevelValue>
      ariaLabel="Floor"
      value={value ?? ALL}
      onChange={(v) => (v === ALL ? onAll() : onChange(v))}
      // 8px under the 40px view switch (which sits 12px under the header).
      className="fixed right-4 top-[calc(3.5rem+var(--safe-top)+60px)] lg:right-6 lg:top-[128px]"
      options={[
        { value: ALL, label: "All floors", title: "All floors · Esc", className: "min-w-10 px-2", children: "All" },
        ...levels.map((level) => ({
          value: level.id,
          label: level.name,
          title: `${level.name} · ${LEVEL_SHORTCUT[level.id]}`,
          className: "min-w-10 px-2",
          children: level.label,
        })),
      ]}
    />
  );
}
