"use client";

import { useRef, type KeyboardEvent } from "react";
import { ChevronRight, Layers, SearchX } from "lucide-react";
import { CloseButton } from "@/components/Buttons";
import { SearchInput } from "@/components/SearchInput";
import { StateMessage } from "@/components/StateMessage";
import type { LevelId } from "../data/levels";
import { EntryRow } from "../find/EntryRow";
import type { FindEntry, FindGroup } from "../find/catalogue";
import type { InputRef } from "../ui/MapPanel";
import { searchFind } from "./search";

type SearchContentProps = {
  groups: FindGroup[];
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (entry: FindEntry) => void;
  onPickFloor: (level: LevelId) => void;
  onClose: () => void;
  /** The desktop panel's ref (focused on open); the phone sheet passes none. */
  inputRef?: InputRef;
  /** One-floor venues: no floor tags on the hits. */
  floorTags: boolean;
};

/**
 * Body of Search: title row, the search field, and a flat list of matches.
 * A floor in the query scopes the list to it; a bare floor also gets a row
 * that opens it. Empty until something is typed. Keyboard: ArrowDown from
 * the field enters the list, ArrowUp from its first row returns to the
 * field, typing on a row goes back into the field.
 */
export function SearchContent({ groups, query, onQueryChange, onPick, onPickFloor, onClose, inputRef, floorTags }: SearchContentProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const field = inputRef ?? localInputRef;
  const searching = query.trim().length > 0;
  const { floor, hits } = searching ? searchFind(groups, query) : { floor: null, hits: [] };
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
        <SearchInput value={query} onChange={onQueryChange} placeholder={floorTags ? "Rooms, food, floors…" : "Stages, hubs, booths…"} inputRef={field} resultCount={searching ? hits.length : null} />
      </div>
      {searching && (
        <div ref={listRef} onKeyDown={onKeyDown} className="min-h-0 flex-1 overflow-y-auto border-t border-dc-hairline">
          {floor && wholeFloor && floorTags && (
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
            <StateMessage icon={SearchX} title="No places found" body={`Nothing matches “${query.trim()}”. Try a stage, hub or booth name.`} size="compact" className="py-8" />
          ) : (
            <ul className="py-1">
              {hits.map((hit) => (
                <li key={hit.key}>
                  <EntryRow entry={hit} floorTag={floorTags} onPick={onPick} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
