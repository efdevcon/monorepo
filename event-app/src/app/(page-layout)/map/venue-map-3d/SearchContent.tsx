"use client";

import { useRef, type KeyboardEvent } from "react";
import { ChevronRight, Layers } from "lucide-react";
import { CloseButton } from "@/components/Buttons";
import { SearchInput } from "@/components/SearchInput";
import { EntryRow } from "./EntryRow";
import { searchFind, type FindEntry, type FindGroup } from "./pois";
import type { LevelId } from "./types";

/** Structural ref type (see SearchInput.tsx for why this isn't React.Ref). */
type InputRef = { current: HTMLInputElement | null };

type SearchContentProps = {
  groups: FindGroup[];
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (entry: FindEntry) => void;
  /** The query named a whole floor and the user chose it: open that floor. */
  onPickFloor: (level: LevelId) => void;
  onClose: () => void;
  /** The desktop panel's ref (focused on open); the phone sheet passes none. */
  inputRef?: InputRef;
};

/**
 * Body of Search (its own surface since 2026-09-21, split out of Find): title
 * row, the search field, and a flat list of matches with floor tags. A floor
 * in the query ("level 1", "toilets l1") scopes the list to it; a bare floor
 * also gets a row that opens it. Empty until something is typed. The shell
 * provides the flex column; the list scrolls inside it.
 *
 * Keyboard (Scott, 2026-09-17): ArrowDown from the field enters the list and
 * ArrowUp from its first row returns to the field; the arrows walk every row,
 * Enter activates, and typing while a row has focus goes back into the field.
 */
export function SearchContent({ groups, query, onQueryChange, onPick, onPickFloor, onClose, inputRef }: SearchContentProps) {
  const listRef = useRef<HTMLDivElement>(null);
  // The phone sheet passes no ref (nothing autofocuses there), but the arrow keys still need the
  // field: an iPad or a narrow desktop window has a hardware keyboard.
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const field = inputRef ?? localInputRef;
  const searching = query.trim().length > 0;
  const { floor, hits } = searching ? searchFind(groups, query) : { floor: null, hits: [] };
  // A bare floor query ("level 1") lists the floor: offer to open it above its places.
  const wholeFloor = floor !== null && floor.count === hits.length;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const target = e.target as HTMLElement;
    const index = target instanceof HTMLButtonElement ? rows.indexOf(target) : -1;
    const inList = index >= 0;
    if (e.key === "ArrowDown") {
      const next = inList ? rows[Math.min(index + 1, rows.length - 1)] : rows[0];
      if (next) {
        e.preventDefault();
        next.focus();
      }
    } else if (e.key === "ArrowUp") {
      if (!inList) return;
      e.preventDefault();
      if (index === 0) field.current?.focus();
      else rows[index - 1].focus();
    } else if (inList && (e.key === "Backspace" || (e.key.length === 1 && e.key !== " "))) {
      // Typing from a row continues the search: the keystroke lands in the re-focused field.
      field.current?.focus();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <h2 className="text-[16px] font-bold leading-none text-dc-fg">Search the map</h2>
        <CloseButton onClick={onClose} />
      </div>
      <div className="px-4 pb-3 pt-3" onKeyDown={onKeyDown}>
        <SearchInput value={query} onChange={onQueryChange} placeholder="Rooms, food, floors…" inputRef={field} resultCount={searching ? hits.length : null} />
      </div>

      {searching && (
        <div ref={listRef} onKeyDown={onKeyDown} className="min-h-0 flex-1 overflow-y-auto border-t border-dc-hairline">
          {floor && wholeFloor && (
            <button
              type="button"
              onClick={() => onPickFloor(floor.level)}
              className="flex w-full cursor-pointer items-center gap-3 border-b border-dc-hairline px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-dc-purple-wash focus-visible:bg-dc-purple-wash focus-visible:outline-none"
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
        </div>
      )}
    </>
  );
}
