"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import cn from "classnames";
import { ChevronDown } from "lucide-react";
import { CloseButton } from "@/components/Buttons";
import { EntryRow } from "./EntryRow";
import type { FindEntry, FindGroup } from "./pois";

type FindContentProps = {
  groups: FindGroup[];
  onPick: (entry: FindEntry) => void;
  onClose: () => void;
};

/**
 * Body of Find, shared by the phone sheet and the desktop panel: title row and
 * the category accordion (one open at a time, places grouped by floor,
 * expanded body on the dc-panel neutral). Browsing only since 2026-09-21: the
 * search field moved to its own Search surface (SearchContent). The shell
 * provides the flex column; the list scrolls inside it.
 *
 * Keyboard (Scott, 2026-09-17): the arrows walk every row (categories and
 * their entries) in visual order, Enter activates, ArrowRight / ArrowLeft open
 * and close a category row. The desktop panel focuses the first category on
 * open (`data-autofocus`), so the keys work without a click (2026-09-21).
 */
export function FindContent({ groups, onPick, onClose }: FindContentProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const target = e.target as HTMLElement;
    const index = target instanceof HTMLButtonElement ? rows.indexOf(target) : -1;
    if (index < 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      rows[e.key === "ArrowDown" ? Math.min(index + 1, rows.length - 1) : Math.max(index - 1, 0)].focus();
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      // Category rows only: open on Right, close on Left.
      const category = target.dataset.category;
      if (!category) return;
      e.preventDefault();
      setExpanded(e.key === "ArrowRight" ? category : expanded === category ? null : expanded);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
        <h2 className="text-[16px] font-bold leading-none text-dc-fg">Find a place</h2>
        <CloseButton onClick={onClose} />
      </div>

      <div ref={listRef} onKeyDown={onKeyDown} className="min-h-0 flex-1 overflow-y-auto border-t border-dc-hairline">
        {groups.map(({ category, count, floors }, i) => {
          const open = expanded === category.id;
          return (
            <div key={category.id} className="border-b border-dc-hairline last:border-b-0">
              <button
                type="button"
                aria-expanded={open}
                data-category={category.id}
                // The desktop panel focuses this on open (MapPanel), so ArrowDown / Right work straight away.
                data-autofocus={i === 0 || undefined}
                onClick={() => setExpanded(open ? null : category.id)}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-dc-purple-wash focus-visible:bg-dc-purple-wash focus-visible:outline-none"
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
        })}
      </div>
    </>
  );
}
