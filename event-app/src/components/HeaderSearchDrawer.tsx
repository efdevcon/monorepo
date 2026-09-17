"use client";

import cn from "classnames";
import { SearchInput } from "@/components/SearchInput";

/** Structural ref type — see SearchInput.tsx for why this isn't React.Ref. */
type InputRef = { current: HTMLInputElement | null };
type DrawerRef = { current: HTMLDivElement | null };

/** aria-controls target for the header search buttons. */
export const HEADER_SEARCH_PANEL_ID = "header-search-panel";

type PanelProps = {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputRef: InputRef;
  /** From useHeaderSearch — the wrapper whose `inert` the hook lifts. */
  drawerRef: DrawerRef;
  /** See SearchInput — "N results" beside the clear ×. */
  resultCount?: number | null;
};

/**
 * The mobile search fold-out, rendered by the page itself (Schedule,
 * Speakers) above its tab strip so opening it pushes the tabs and list down
 * instead of covering them — the old header overlay left no way to switch
 * days mid-search. A lavender strip that fuses with the tabs band; mobile
 * only (desktop has its toolbar field). The content stays mounted while collapsed
 * (grid-rows, not unmount): iOS Safari only raises the on-screen keyboard for
 * a focus() call made synchronously inside a user gesture, so the toggle
 * handler (useHeaderSearch) must be able to focus the input the moment it
 * flips `open` — a 0-height overflow-hidden input is still focusable, an
 * unmounted one is not. While collapsed the wrapper is `inert`, keeping the
 * invisible input (and its clear ×) out of the tab order and the a11y tree;
 * the hook lifts the attribute synchronously before focusing.
 *
 * Folds back up on its own when focus leaves it with nothing typed: an empty
 * field left open after a tap elsewhere read as stuck.
 */
export function SearchDrawerPanel({
  open,
  onClose,
  value,
  onChange,
  placeholder,
  inputRef,
  drawerRef,
  resultCount,
}: PanelProps) {
  return (
    <div
      id={HEADER_SEARCH_PANEL_ID}
      ref={drawerRef}
      inert={!open || undefined}
      className={cn(
        // 200ms in / 150ms out (exits run faster): the house 300ms sheet
        // timing read as sluggish on a fold-out this small.
        "grid transition-[grid-template-rows] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        open ? "grid-rows-[1fr] duration-200" : "grid-rows-[0fr] duration-150",
        "lg:hidden"
      )}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        // Enter drops the iOS keyboard but keeps the drawer + results.
        if (e.key === "Enter") inputRef.current?.blur();
      }}
      onBlur={(e) => {
        if (!open) return;
        // Focus moving within the drawer (input ↔ clear ×) is not a dismissal.
        const next = e.relatedTarget;
        if (next instanceof Node && e.currentTarget.contains(next)) return;
        // The DOM value, not the prop: immune to a not-yet-flushed onChange.
        if ((inputRef.current?.value ?? value).trim() === "") onClose();
      }}
    >
      <div className="min-h-0 overflow-hidden">
        {/* In flow nothing scrolls beneath it, so no glass; the white field
            carries its own hairline against the lavender. */}
        <div className="bg-dc-lavender px-4 py-3">
          <SearchInput
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            inputRef={inputRef}
            resultCount={resultCount}
          />
        </div>
      </div>
    </div>
  );
}
