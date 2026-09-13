"use client";

import { useState } from "react";
import cn from "classnames";
import { ChevronDown, ChevronRight, Layers, type LucideIcon } from "lucide-react";
import { CloseButton } from "@/components/Buttons";
import { SearchInput } from "@/components/SearchInput";
import { iconUrl } from "./icons";
import { searchFind, type FindEntry, type FindGroup } from "./pois";
import type { LevelId } from "./types";

/** Structural ref type (see SearchInput.tsx for why this isn't React.Ref). */
type InputRef = { current: HTMLInputElement | null };

type FindContentProps = {
  groups: FindGroup[];
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (entry: FindEntry) => void;
  /** The query named a whole floor and the user chose it: open that floor. */
  onPickFloor: (level: LevelId) => void;
  onClose: () => void;
  inputRef?: InputRef;
};

/** Short floor tag for search results (the accordion has floor sub-headers instead). */
const FLOOR_TAG: Record<LevelId, string> = { G: "G", L1: "L1", L2: "L2" };

/**
 * Body of Find, shared by the phone sheet and the desktop panel: title row,
 * search field, then either the category accordion (one open at a time, places
 * grouped by floor, expanded body on the dc-panel neutral) or, while typing, a
 * flat list of matches with floor tags. A floor in the query ("level 1",
 * "toilets l1") scopes the list to it; a bare floor also gets a row that opens
 * it. The shell provides the flex column; the list scrolls inside it.
 */
export function FindContent({ groups, query, onQueryChange, onPick, onPickFloor, onClose, inputRef }: FindContentProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const searching = query.trim().length > 0;
  const { floor, hits } = searching ? searchFind(groups, query) : { floor: null, hits: [] };
  // A bare floor query ("level 1") lists the floor: offer to open it above its places.
  const wholeFloor = floor !== null && floor.count === hits.length;

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <h2 className="text-[16px] font-bold leading-none text-dc-fg">Find a place</h2>
        <CloseButton onClick={onClose} />
      </div>
      <div className="px-4 pb-3 pt-3">
        <SearchInput value={query} onChange={onQueryChange} placeholder="Search rooms, food, floors…" inputRef={inputRef} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-dc-hairline">
        {searching ? (
          <>
            {floor && wholeFloor && (
              <button
                type="button"
                onClick={() => onPickFloor(floor.level)}
                className="flex w-full cursor-pointer items-center gap-3 border-b border-dc-hairline px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-dc-purple-wash"
              >
                <Layers className="size-4 shrink-0 text-dc-purple" aria-hidden />
                <span className="min-w-0 flex-1 text-[14px] font-semibold leading-none text-dc-fg2">{floor.name}</span>
                <span className="text-[12px] leading-none text-dc-muted">
                  {floor.count} {floor.count === 1 ? "place" : "places"}
                </span>
                <ChevronRight className="size-4 shrink-0 text-dc-muted" aria-hidden />
              </button>
            )}
            {hits.length === 0 ? (
              <p className="px-4 py-6 text-center text-[14px] text-dc-muted">No places match “{query.trim()}”</p>
            ) : (
              <ul className="py-1">
                {hits.map((hit) => (
                  <li key={hit.key}>
                    <EntryRow entry={hit} Icon={hit.category.Icon} floorTag onPick={onPick} />
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          groups.map(({ category, count, floors }) => {
            const open = expanded === category.id;
            return (
              <div key={category.id} className="border-b border-dc-hairline last:border-b-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setExpanded(open ? null : category.id)}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-dc-purple-wash"
                >
                  <category.Icon className="size-4 shrink-0 text-dc-purple" aria-hidden />
                  <span className="min-w-0 flex-1 text-[14px] font-semibold leading-none text-dc-fg2">{category.label}</span>
                  <span className="text-[12px] leading-none text-dc-muted">{count}</span>
                  <ChevronDown className={cn("size-4 shrink-0 text-dc-muted transition-transform duration-200 ease-out motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
                </button>
                {open && (
                  <div className="bg-dc-panel pb-1">
                    {floors.map((floor) => (
                      <div key={floor.level}>
                        <p className="px-4 pb-1 pt-2.5 text-[11px] font-semibold uppercase leading-none tracking-[0.5px] text-dc-muted">{floor.name}</p>
                        <ul>
                          {floor.entries.map((entry) => (
                            <li key={entry.key}>
                              <EntryRow entry={entry} Icon={category.Icon} onPick={onPick} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function EntryRow({ entry, Icon, floorTag, onPick }: { entry: FindEntry; Icon: LucideIcon; floorTag?: boolean; onPick: (entry: FindEntry) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(entry)}
      // Same hover as the category rows (Scott): a white tint on the panel fill was invisible.
      className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors duration-150 ease-out hover:bg-dc-purple-wash"
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
