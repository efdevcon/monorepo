"use client";

import { useMemo, useState } from "react";
import cn from "classnames";
import {
  ArrowDownToLine,
  ArrowRightToLine,
  Check,
  ChevronDown,
} from "lucide-react";
import { CloseButton, PrimaryButton, SecondaryButton } from "@/components/Buttons";
import type { FilterFacet, Filters } from "./useScheduleState";
import { getTrackTheme } from "./trackTheme";

const CLS_PREFIX = "[CLS]";
const stripCls = (v: string) => v.replace(CLS_PREFIX, "").trim();

function AccordionSection({
  title,
  count = 0,
  defaultOpen,
  children,
}: {
  title: string;
  /** Selected filters in this section — shown as "(X)" while collapsed. */
  count?: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex w-full flex-col">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-3",
          open && "border-b border-dc-hairline pb-2"
        )}
      >
        <span className="text-[16px] font-bold leading-6 text-dc-fg2">
          {title}
          {!open && count > 0 && (
            <span className="font-normal"> ({count})</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-dc-purple transition-transform duration-200 ease-out motion-reduce:transition-none",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/** Design checkbox: 14px white box (#aca6b9 border) → 16px purple box + check. */
function CheckboxRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="group flex h-6 cursor-pointer items-center gap-2"
    >
      <span className="flex size-4 items-center justify-center">
        {checked ? (
          <span className="flex size-4 items-center justify-center rounded-[4px] bg-dc-purple">
            <Check className="size-3 text-white" strokeWidth={3} />
          </span>
        ) : (
          <span className="size-3.5 rounded-[4px] border border-[#aca6b9] bg-white group-hover:bg-dc-purple-soft" />
        )}
      </span>
      <span className="text-[14px] leading-5 text-dc-fg2">{label}</span>
    </button>
  );
}

/**
 * Filter panel body (Figma "Full filter panel"): Tracks as gem pill-chips,
 * Topics as plain pill-chips (the shared Speakers-page vocabulary),
 * Locations / CLS / Session formats / Expertise as checkbox rows, wrapped in
 * accordions, with the white header (Clear all, close) and the sticky footer
 * (Close, Reset filters). Shells position it: bottom sheet on mobile, right
 * column on desktop.
 */
export function FilterPanelContent({
  options,
  filters,
  onToggle,
  onClear,
  onClose,
  defaultOpen = false,
}: {
  options: Record<FilterFacet, string[]>;
  filters: Filters;
  onToggle: (facet: FilterFacet, value: string) => void;
  onClear: () => void;
  onClose: () => void;
  /** Whether accordion sections start expanded (desktop panel). */
  defaultOpen?: boolean;
}) {
  const { tracks, clsTracks } = useMemo(
    () => ({
      tracks: options.track.filter((t) => !t.startsWith(CLS_PREFIX)),
      clsTracks: options.track.filter((t) => t.startsWith(CLS_PREFIX)),
    }),
    [options.track]
  );

  // Mobile renders as a bottom-anchored sheet — square bottom corners there;
  // the desktop side panel floats, so it keeps all four.
  return (
    <div className="flex h-full min-h-0 flex-col overflow-clip rounded-t-xl border border-dc-hairline bg-dc-panel lg:rounded-xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-dc-hairline bg-white p-4">
        <span className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
          Filters
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={onClear}
            className="cursor-pointer text-[14px] font-bold leading-none text-dc-purple hover:underline"
          >
            Clear all
          </button>
          <CloseButton onClick={onClose} aria-label="Close filters" />
        </div>
      </div>

      {/* Scrollable facet sections */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
        {tracks.length > 0 && (
          <AccordionSection
            title="Tracks"
            // CLS picks share filters.track — count only this section's own.
            count={filters.track.filter((t) => tracks.includes(t)).length}
            defaultOpen={defaultOpen}
          >
            <div className="flex flex-wrap gap-2">
              {tracks.map((track) => {
                const active = filters.track.includes(track);
                const theme = getTrackTheme(track);
                return (
                  <button
                    key={track}
                    onClick={() => onToggle("track", track)}
                    className={cn(
                      "flex min-h-8 cursor-pointer items-center gap-2 rounded-full px-3 py-1 text-[12px] leading-none text-dc-fg2 hover:border-dc-purple",
                      active
                        ? "border border-transparent font-semibold"
                        : "border border-dc-hairline bg-white font-normal"
                    )}
                    style={
                      active ? { backgroundColor: theme.color } : undefined
                    }
                  >
                    {theme.gem && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={theme.gem}
                        alt=""
                        className="size-3.5 object-contain"
                        loading="lazy"
                      />
                    )}
                    {track}
                  </button>
                );
              })}
            </div>
          </AccordionSection>
        )}

        {options.topic.length > 0 && (
          <AccordionSection
            title="Topics"
            count={filters.topic.length}
            defaultOpen={defaultOpen}
          >
            {/* Same chip grammar as Tracks; topics have no track theme, so
                the active state is the app's purple treatment instead of a
                per-track pastel. The list is the shared Speakers-page topic
                vocabulary (top session tags by frequency). */}
            <div className="flex flex-wrap gap-2">
              {options.topic.map((topic) => {
                const active = filters.topic.includes(topic);
                return (
                  <button
                    key={topic}
                    onClick={() => onToggle("topic", topic)}
                    aria-pressed={active}
                    className={cn(
                      "flex min-h-8 cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-[12px] leading-none text-dc-fg2 hover:border-dc-purple",
                      active
                        ? "border-dc-purple bg-dc-lavender font-semibold"
                        : "border-dc-hairline bg-white font-normal"
                    )}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </AccordionSection>
        )}

        {options.room.length > 0 && (
          <AccordionSection
            title="Locations"
            count={filters.room.length}
            defaultOpen={defaultOpen}
          >
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {options.room.map((room) => (
                <CheckboxRow
                  key={room}
                  label={room}
                  checked={filters.room.includes(room)}
                  onToggle={() => onToggle("room", room)}
                />
              ))}
            </div>
          </AccordionSection>
        )}

        {clsTracks.length > 0 && (
          <AccordionSection
            title="Community-led Sessions (CLS)"
            count={filters.track.filter((t) => clsTracks.includes(t)).length}
            defaultOpen={defaultOpen}
          >
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {clsTracks.map((track) => (
                <CheckboxRow
                  key={track}
                  label={stripCls(track)}
                  checked={filters.track.includes(track)}
                  onToggle={() => onToggle("track", track)}
                />
              ))}
            </div>
          </AccordionSection>
        )}

        {options.type.length > 0 && (
          <AccordionSection
            title="Session formats"
            count={filters.type.length}
            defaultOpen={defaultOpen}
          >
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {options.type.map((type) => (
                <CheckboxRow
                  key={type}
                  label={type}
                  checked={filters.type.includes(type)}
                  onToggle={() => onToggle("type", type)}
                />
              ))}
            </div>
          </AccordionSection>
        )}

        {options.expertise.length > 0 && (
          <AccordionSection
            title="Expertise"
            count={filters.expertise.length}
            defaultOpen={defaultOpen}
          >
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {options.expertise.map((level) => (
                <CheckboxRow
                  key={level}
                  label={level}
                  checked={filters.expertise.includes(level)}
                  onToggle={() => onToggle("expertise", level)}
                />
              ))}
            </div>
          </AccordionSection>
        )}
      </div>

      {/* Sticky footer. Close is the primary CTA (filters apply live, so
          "done" is the natural forward action, not the destructive reset). */}
      <div className="flex shrink-0 gap-3 border-t border-dc-hairline bg-white p-4">
        <SecondaryButton onClick={onClear}>Reset filters</SecondaryButton>
        <PrimaryButton onClick={onClose} className="flex-1">
          {/* Icon points where the panel exits: down for the mobile bottom
              sheet, right for the desktop side panel. */}
          <ArrowDownToLine className="size-4 lg:hidden" />
          <ArrowRightToLine className="hidden size-4 lg:block" />
          Close
        </PrimaryButton>
      </div>
    </div>
  );
}
