"use client";

import type { LucideIcon } from "lucide-react";
import { iconUrl } from "./icons";
import type { FindEntry } from "./pois";
import type { LevelId } from "./types";

/** Short floor tag for search results (the Find accordion has floor sub-headers instead). */
export const FLOOR_TAG: Record<LevelId, string> = { G: "G", L1: "L1", L2: "L2" };

/** One place in a Find or Search list: theme icon (or the category's lucide glyph), name, ×N for collapsed duplicates, optional floor tag. */
export function EntryRow({ entry, Icon, floorTag, onPick }: { entry: FindEntry; Icon: LucideIcon; floorTag?: boolean; onPick: (entry: FindEntry) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(entry)}
      // Same hover as the category rows (Scott): a white tint on the panel fill was invisible. Keyboard focus reads the same.
      className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors duration-150 ease-out hover:bg-dc-purple-wash focus-visible:bg-dc-purple-wash focus-visible:outline-none"
    >
      <span className="flex size-7 shrink-0 items-center justify-center">
        {entry.icon ? (
          // eslint-disable-next-line @next/next/no-img-element -- static PNG under public/, no optimisation wanted
          <img src={iconUrl(entry.icon)} alt="" className="size-7 object-contain" />
        ) : (
          <Icon className="size-4 text-dc-muted" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] leading-5 text-dc-fg2">{entry.name}</span>
      {entry.shapes.length > 1 && <span className="text-[12px] leading-none text-dc-muted">×{entry.shapes.length}</span>}
      {floorTag && <span className="rounded-[4px] bg-dc-lavender px-1.5 py-0.5 text-[11px] font-semibold leading-none text-dc-purple">{FLOOR_TAG[entry.level]}</span>}
    </button>
  );
}
