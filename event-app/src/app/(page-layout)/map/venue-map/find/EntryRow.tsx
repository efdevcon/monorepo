"use client";

import { LEVELS } from "../data/levels";
import { iconUrl } from "../data/icons.generated";
import type { FindEntry } from "./catalogue";

const LABEL = new Map(LEVELS.map((l) => [l.id, l.label]));

/** One place in a Find or Search list: theme icon (or the category's lucide glyph), name, ×N for collapsed copies, optional floor tag. */
export function EntryRow({ entry, floorTag, onPick }: { entry: FindEntry; floorTag?: boolean; onPick: (entry: FindEntry) => void }) {
  const Icon = entry.category.Icon;
  return (
    <button
      type="button"
      onClick={() => onPick(entry)}
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
      {entry.areas.length > 1 && <span className="text-[12px] leading-none text-dc-muted">×{entry.areas.length}</span>}
      {floorTag && <span className="rounded-[4px] bg-dc-lavender px-1.5 py-0.5 text-[11px] font-semibold leading-none text-dc-purple">{LABEL.get(entry.level)}</span>}
    </button>
  );
}
