"use client";

import { usePaneActive } from "@/components/paneContext";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import cn from "classnames";
import { HEADER_DRAWER_ID } from "@/components/AppHeader";
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
  /**
   * In-flow variant (Schedule): rendered by the page itself above its day
   * tabs, so opening it pushes the tabs and list down instead of covering the
   * tabs — the overlay left no way to switch days mid-search. Lavender strip
   * that fuses with the DayTabs band; mobile only (desktop has its toolbar
   * field).
   */
  inline?: boolean;
  /** See SearchInput — "N results" beside the clear ×. */
  resultCount?: number | null;
};

/**
 * The mobile search fold-out. The content stays mounted while collapsed
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
  inline = false,
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
        inline && "lg:hidden"
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
        <div
          className={cn(
            "px-4 py-3",
            inline
              ? // In flow nothing scrolls beneath it, so no glass; the white
                // field carries its own hairline against the lavender.
                "bg-dc-lavender"
              : "border-b border-dc-hairline bg-white/75 backdrop-blur-[4px]"
          )}
        >
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

/**
 * The panel portaled into the header's fold-out slot (#header-drawer), where
 * it overlays the page below the bar (Speakers). Schedule renders the panel
 * inline instead — see `inline` above.
 */
export function HeaderSearchDrawer(props: Omit<PanelProps, "inline">) {
  const [target, setTarget] = useState<Element | null>(null);
  const paneActive = usePaneActive();
  useEffect(() => {
    setTarget(document.getElementById(HEADER_DRAWER_ID));
  }, []);
  if (!target || !paneActive) return null;

  return <>{createPortal(<SearchDrawerPanel {...props} />, target)}</>;
}
