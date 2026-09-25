"use client";

import { ListFilter, Search, Star } from "lucide-react";
import cn from "classnames";
import type { ComponentProps, ReactNode } from "react";
import { usePaneActive } from "@/components/paneContext";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { HeaderActionsPortal } from "@/components/DetailLayer";
import { HEADER_SEARCH_PANEL_ID } from "@/components/HeaderSearchDrawer";
import { useInterestPulse, type InterestKind } from "@/data/interested/interestPulse";

/**
 * Shared toolbar-pill primitives (Figma): the purple ghost text-button
 * ("Jump to now", "A–Z index"), the labelled pill (HeaderPill) in its mobile
 * header and desktop toolbar sizes, and the toolbars built from them, used
 * by the schedule and speakers pages so both share identical sizing.
 */
export const ghostPill =
  "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-bold leading-none text-dc-purple transition-colors duration-150 ease-out hover:bg-dc-purple-wash";

/**
 * Desktop "My Interests" toggle (Figma "InterestedCTA", relabelled to match
 * the mobile pill): the same pill as the header's at desktop toolbar sizing
 * (36px, 14px label), with the saved count while active and the "+1" swap
 * when an item is starred. Listens only on desktop — on mobile it sits in
 * a hidden container and the header pill plays the bubble instead.
 */
export function InterestedPill({
  kind,
  active,
  count,
  onToggle,
  className,
}: {
  kind: InterestKind;
  active: boolean;
  /** Saved items, event-wide; shown as the count bubble while active. */
  count: number;
  onToggle: () => void;
  className?: string;
}) {
  const paneActive = usePaneActive();
  const isDesktop = useIsDesktop();
  const [pulse, clearPulse] = useInterestPulse(kind, paneActive && isDesktop);
  return (
    <HeaderPill
      variant="toolbar"
      icon={<Star fill="currentColor" />}
      label="My Interests"
      active={active}
      count={active ? count : undefined}
      countNoun="saved"
      pulse={pulse}
      onPulseEnd={clearPulse}
      onClick={onToggle}
      aria-pressed={active}
      className={className}
    />
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
  variant = "header",
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
  /**
   * "header": the 32px mobile app-header pill. "toolbar": the desktop list
   * toolbar's 36px / 14px sizing (InterestedPill), hover wash at rest.
   */
  variant?: "header" | "toolbar";
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
   * Transient "+1" bubble that takes the icon's place (see interestPulse.ts):
   * mounts per `key`, plays once (1.65s, house curve) while the icon leaves
   * through the top and returns from below on the same clock, then
   * `onPulseEnd` clears it. Overlaid, so the label never shifts.
   */
  pulse?: { key: number; label: string } | null;
  onPulseEnd?: () => void;
}) {
  const toolbar = variant === "toolbar";
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "relative flex cursor-pointer items-center justify-center gap-2 rounded-full border leading-none transition-colors duration-150 ease-out before:absolute before:content-['']",
        // before: pads each size to the 44px touch floor (32 + 2×6, 36 + 2×4).
        toolbar
          ? "min-h-9 px-3 py-1 text-[14px] text-dc-fg2 before:-inset-1"
          : "min-h-8 py-1 pl-[10px] pr-3 text-[13px] text-dc-fg before:-inset-1.5",
        active
          ? "border-dc-purple bg-dc-lavender"
          : cn("border-dc-hairline bg-white", toolbar && "hover:bg-dc-purple-wash"),
        className
      )}
    >
      <span className="relative flex size-4 shrink-0">
        {/* Clip box the pill's inner height (16px icon + 7px each side in
            the 32px pill, 9px in the 36px one; the border excluded), anchored
            to the icon slot so it follows the centred content: while a pulse
            plays the icon leaves through the pill's top edge and the "+1"
            rises into its place from the bottom, then they swap back. The
            button itself can't clip — that would cut the before: tap-target
            extension. */}
        <span
          className={cn(
            "absolute inset-x-0 overflow-hidden",
            toolbar ? "-inset-y-[9px]" : "-inset-y-[7px]"
          )}
        >
          <span
            key={`icon-${pulse?.key ?? 0}`}
            className={cn(
              "flex h-full items-center justify-center [&>svg]:size-4 [&>svg]:text-dc-purple",
              pulse &&
                "animate-interest-star-swap motion-reduce:animate-interest-star-swap-fade"
            )}
          >
            {icon}
          </span>
          {pulse && (
            <span
              key={`bubble-${pulse.key}`}
              aria-hidden
              onAnimationEnd={onPulseEnd}
              className={cn(
                "pointer-events-none absolute inset-x-0 flex size-4 items-center justify-center rounded-full bg-dc-purple text-[10px] font-semibold leading-none text-white animate-interest-pulse motion-reduce:animate-interest-pulse-fade",
                toolbar ? "top-[9px]" : "top-[7px]"
              )}
            >
              {pulse.label}
            </span>
          )}
        </span>
      </span>
      {/* leading-5, not the pill's leading-none: truncate clips overflow, and
          a 13px line box with no leading cut the descenders ("Settings"). */}
      <span className="truncate leading-5">{label}</span>
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
  const isDesktop = useIsDesktop();
  // Only the visible pill listens: on desktop this bar is display:none and
  // the list toolbar's InterestedPill plays the bubble.
  const [pulse, clearPulse] = useInterestPulse(kind, paneActive && !isDesktop);
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
