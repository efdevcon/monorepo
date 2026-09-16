"use client";

import { ListFilter, Search, Star } from "lucide-react";
import cn from "classnames";
import type { ComponentProps, ReactNode } from "react";
import { usePaneActive } from "@/components/paneContext";
import { HeaderActionsPortal } from "@/components/DetailLayer";
import { HEADER_SEARCH_PANEL_ID } from "@/components/HeaderSearchDrawer";
import { useInterestPulse, type InterestKind } from "@/data/interested/interestPulse";

/**
 * Shared toolbar-pill primitives (Figma): the purple ghost text-button
 * ("Jump to now", "A–Z index") and the Interested toggle pill, used by the
 * schedule and speakers action rows so both pages share identical sizing.
 */
export const ghostPill =
  "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-bold leading-none text-dc-purple transition-colors duration-150 ease-out hover:bg-dc-purple-wash";

/** Interested toggle pill (Figma "InterestedCTA"): lavender fill when active. */
export function InterestedPill({
  active,
  onToggle,
  className,
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-[14px] leading-none text-dc-fg2 transition-colors duration-150 ease-out",
        active
          ? "border-dc-purple bg-dc-lavender"
          : "border-dc-hairline bg-white hover:bg-dc-purple-wash",
        className
      )}
    >
      <Star className="size-4 text-dc-purple" fill="currentColor" />
      Interested
    </button>
  );
}

/**
 * Mobile app-header pill (Figma "New Top Nav"): 32px white hairline pill,
 * 16px purple icon, 13px label (design's 12px read small on device); lavender fill + purple border when active,
 * with an optional 16px count bubble on the top-right corner (widens to a
 * pill for two digits). Replaced the
 * icon-only circles — testers didn't read the star and clock glyphs.
 * before:-inset-1.5 pads the 32px pill to the 44px touch floor.
 */
export function HeaderPill({
  icon,
  label,
  active = false,
  count,
  countNoun,
  pulse,
  onPulseEnd,
  className,
  ...props
}: ComponentProps<"button"> & {
  icon: ReactNode;
  label: string;
  active?: boolean;
  /** Shown as a bubble when > 0. */
  count?: number;
  /**
   * What the count counts ("applied", "saved"): AT reads ", 3 applied" after
   * the label instead of a bare "3" glued to it.
   */
  countNoun?: string;
  /**
   * Transient "+1" bubble nested in the pill's right end (see
   * interestPulse.ts): mounts per `key`, plays once (1.65s, house curve),
   * then `onPulseEnd` clears it. Overlaid, so
   * the label never shifts.
   */
  pulse?: { key: number; label: string } | null;
  onPulseEnd?: () => void;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "relative flex min-h-8 cursor-pointer items-center justify-center gap-2 rounded-full border py-1 pl-[10px] pr-3 text-[13px] leading-none text-dc-fg transition-colors duration-150 ease-out before:absolute before:-inset-1.5 before:content-['']",
        active ? "border-dc-purple bg-dc-lavender" : "border-dc-hairline bg-white",
        className
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center [&>svg]:size-4 [&>svg]:text-dc-purple">
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {pulse && (
        // Clipped to the pill's own rounded box (an overlay, not overflow on
        // the button — that would also clip the before: tap-target extension),
        // so the bubble rises out of the bottom edge and leaves through the
        // top. It rests nested in the rounded end: 16px in a 32px pill, 8px
        // from the top, right and bottom (7px + the 1px border on the right).
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
        >
          <span
            key={pulse.key}
            onAnimationEnd={onPulseEnd}
            className="absolute right-[7px] top-1/2 flex h-4 min-w-4 -translate-y-1/2 items-center justify-center rounded-full bg-dc-purple px-1 text-[10px] font-semibold leading-none text-white animate-interest-pulse motion-reduce:animate-interest-pulse-fade"
          >
            {pulse.label}
          </span>
        </span>
      )}
      {count != null && count > 0 && (
        <>
          <span
            aria-hidden={countNoun ? true : undefined}
            className="absolute -right-1 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-dc-purple px-[5px] text-[11px] font-semibold leading-none tabular-nums tracking-[-0.25px] text-white ring-1 ring-white"
          >
            {count}
          </span>
          {countNoun && (
            <span className="sr-only">
              , {count} {countNoun}
            </span>
          )}
        </>
      )}
    </button>
  );
}

/**
 * The mobile app-header row for the two list pages (Figma "New Top Nav"):
 * labelled Search / My Interests / Filter pills portaled into AppHeader's
 * action slot — the icon-only circles read poorly in testing. One component
 * so Schedule and Speakers can't drift (they once disagreed on when Filter
 * lights up). Lavender fill carries the active state; on Search it means
 * both "panel open" and "query applied with the panel closed". Counts:
 * saved items on My Interests (event-wide, not the shown day), applied
 * filters on Filter. Renders nothing while the pane is hidden.
 */
export function HeaderToolbar({
  kind,
  searchLabel,
  searchOpen,
  searchActive,
  onToggleSearch,
  interestedOnly,
  interestedCount,
  onToggleInterested,
  filterCount,
  filtersOpen,
  onOpenFilters,
}: {
  /** Which interest additions play the "+1" bubble on My Interests. */
  kind: InterestKind;
  /** Accessible name for Search ("Search sessions"); the visible label is shared. */
  searchLabel: string;
  searchOpen: boolean;
  searchActive: boolean;
  onToggleSearch: () => void;
  interestedOnly: boolean;
  interestedCount: number;
  onToggleInterested: () => void;
  filterCount: number;
  filtersOpen: boolean;
  onOpenFilters: () => void;
}) {
  const paneActive = usePaneActive();
  const [pulse, clearPulse] = useInterestPulse(kind, paneActive);
  return (
    <HeaderActionsPortal>
      <HeaderPill
        icon={<Search />}
        label="Search"
        active={searchActive}
        onClick={onToggleSearch}
        // Keep focus in the search field while tapping the pill: otherwise
        // the panel's empty-field auto-close fires first and this click
        // re-opens it.
        onMouseDown={(e) => e.preventDefault()}
        aria-label={searchLabel}
        aria-expanded={searchOpen}
        aria-controls={HEADER_SEARCH_PANEL_ID}
        className="shrink-0"
      />
      <HeaderPill
        icon={<Star fill="currentColor" />}
        label="My Interests"
        active={interestedOnly}
        count={interestedOnly ? interestedCount : undefined}
        countNoun="saved"
        pulse={pulse}
        onPulseEnd={clearPulse}
        onClick={onToggleInterested}
        aria-pressed={interestedOnly}
        className="min-w-0 flex-1"
      />
      <HeaderPill
        icon={<ListFilter />}
        label="Filter"
        active={filtersOpen || filterCount > 0}
        count={filterCount}
        countNoun="applied"
        onClick={onOpenFilters}
        aria-expanded={filtersOpen}
        className="shrink-0"
      />
    </HeaderActionsPortal>
  );
}
