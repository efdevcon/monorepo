"use client";

import { useMemo, useState } from "react";
import cn from "classnames";
import {
  ArrowDownToLine,
  ArrowRightToLine,
  Check,
  ChevronDown,
  Tent,
  Users,
} from "lucide-react";
import { CloseButton, PrimaryButton, SecondaryButton } from "@/components/Buttons";
import type { FilterFacet, Filters } from "./useScheduleState";
import { getTrackTheme } from "./trackTheme";
import { formatDayKeyLabel } from "./utils";
import type { CommunityRef } from "@/data/programme";

/**
 * Which programme(s) the panel filters. "hubs": the Community programme
 * (the hubs' sheets and the community-led sessions), where Tracks is
 * dropped and the two community sections lead; the sheets' Topic column fills "Topics".
 * "both": My Interests spanning the two programmes, which keeps Tracks and
 * adds them under it. "main": the Devcon programme, no communities.
 */
export type FilterPanelMode = "main" | "hubs" | "both";

const NO_COMMUNITIES: CommunityRef[] = [];

/** A "[CLS]" track is a community, never a Tracks chip. */
const CLS_PREFIX = "[CLS]";

/** The two community sections, in panel order (a community's `section` picks). */
const COMMUNITY_SECTIONS: ReadonlyArray<{ section: CommunityRef["section"]; title: string }> = [
  { section: "hub", title: "Community Hubs" },
  { section: "cls", title: "Community-led Sessions" },
];

const MULTI_DAY_LABEL = "Multiple days";

/**
 * Community-led groups by the venue day they run on, days in order, then one
 * "Multiple days" group for those spanning more than one. Names keep the
 * alphabetical order they arrive in.
 */
function groupCommunitiesByDay(list: CommunityRef[]): Array<{ key: string; label: string; items: CommunityRef[] }> {
  const byDay = new Map<string, CommunityRef[]>();
  const multi: CommunityRef[] = [];
  for (const c of list) {
    if (c.days.length > 1) multi.push(c);
    else {
      const day = c.days[0] ?? "";
      byDay.set(day, [...(byDay.get(day) ?? []), c]);
    }
  }
  const groups = [...byDay.keys()]
    .sort()
    .map((day) => ({ key: day, label: day ? formatDayKeyLabel(day) : MULTI_DAY_LABEL, items: byDay.get(day)! }));
  if (multi.length > 0) groups.push({ key: "multi", label: MULTI_DAY_LABEL, items: multi });
  return groups;
}

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
    // items-start + a line-height-tall (h-5) box container: long labels wrap
    // left-aligned (buttons center text by default) under a checkbox that
    // stays centered on the first line instead of the whole block.
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="group flex min-h-6 cursor-pointer items-start gap-2 text-left"
    >
      <span className="flex h-5 w-4 shrink-0 items-center justify-center">
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

/** Plain pill-chip (Topics, Hubs): purple treatment when active. */
function TopicChip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "flex min-h-8 cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-[12px] leading-none text-dc-fg2 hover:border-dc-purple",
        active
          ? "border-dc-purple bg-dc-lavender font-semibold"
          : "border-dc-hairline bg-white font-normal"
      )}
    >
      {label}
    </button>
  );
}

/**
 * Filter panel body (Figma "Full filter panel"): Tracks as gem pill-chips,
 * Community Hubs and Community-led Sessions as pill-chips with the
 * community's mark, Topics as plain
 * pill-chips (the shared Speakers-page vocabulary), Locations / Session
 * formats / Expertise as checkbox rows, wrapped in accordions, with the
 * white header (Clear all, close) and the sticky footer (Close, Reset
 * filters). Shells position it: bottom sheet on mobile, right column on
 * desktop.
 */
export function FilterPanelContent({
  options,
  filters,
  onToggle,
  onClear,
  onClose,
  defaultOpen = false,
  mode = "main",
  communities = NO_COMMUNITIES,
}: {
  options: Record<FilterFacet, string[]>;
  filters: Filters;
  onToggle: (facet: FilterFacet, value: string) => void;
  onClear: () => void;
  onClose: () => void;
  /** Whether accordion sections start expanded (desktop panel). */
  defaultOpen?: boolean;
  mode?: FilterPanelMode;
  /** The communities (hubs and community-led groups) in the sessions in view ("hubs" / "both" modes). */
  communities?: CommunityRef[];
}) {
  const tracks = useMemo(() => options.track.filter((t) => !t.startsWith(CLS_PREFIX)), [options.track]);

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
        {mode !== "hubs" && tracks.length > 0 && (
          <AccordionSection
            title="Tracks"
            // Only this section's own picks.
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
                      />
                    )}
                    {track}
                  </button>
                );
              })}
            </div>
          </AccordionSection>
        )}

        {/* The communities in view as two sections, the hubs' sheets and the
            "[CLS]" groups (one merged "Communities" list read as one thing;
            Scott, 2026-10-27): first in the Community programme, under Tracks
            when My Interests spans both. Both pick through the one community
            facet; each section counts only its own keys. The community-led
            section is sub-grouped by the day each group runs on, with the
            ones spanning several days together at the end (a flat list of
            nine names said nothing about when; Scott, 2026-10-27). */}
        {mode !== "main" &&
          COMMUNITY_SECTIONS.map(({ section, title }) => {
            const list = communities.filter((c) => c.section === section);
            if (list.length === 0) return null;
            const groups = section === "cls" ? groupCommunitiesByDay(list) : [{ key: "all", label: null, items: list }];
            return (
              <AccordionSection
                key={section}
                title={title}
                count={list.filter((c) => filters.community.includes(c.key)).length}
                defaultOpen={defaultOpen}
              >
                <div className="flex flex-col gap-3">
                  {groups.map((group) => (
                    <div key={group.key} className="flex flex-col gap-2">
                      {group.label && (
                        <h4 className="text-[14px] font-medium leading-5 text-dc-muted">{group.label}</h4>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((c) => {
                          const active = filters.community.includes(c.key);
                          return (
                            <button
                              key={c.key}
                              onClick={() => onToggle("community", c.key)}
                              className={cn(
                                "flex min-h-8 cursor-pointer items-center gap-2 rounded-full px-3 py-1 text-[12px] leading-none text-dc-fg2 hover:border-dc-purple",
                                active
                                  ? "border border-transparent font-semibold"
                                  : "border border-dc-hairline bg-white font-normal"
                              )}
                              style={active ? { backgroundColor: c.color } : undefined}
                            >
                              {c.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={c.logo} alt="" className="size-3.5 object-contain" />
                              ) : c.kind === "hub" ? (
                                <Tent className="size-3.5 shrink-0" aria-hidden />
                              ) : (
                                <Users className="size-3.5 shrink-0" aria-hidden />
                              )}
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionSection>
            );
          })}

        {options.topic.length > 0 && (
          <AccordionSection
            title="Topics"
            count={filters.topic.length}
            defaultOpen={defaultOpen}
          >
            {/* Same chip grammar as Tracks; topics have no track theme, so
                the active state is the app's purple treatment instead of a
                per-track pastel. The list is the shared Speakers-page topic
                vocabulary (the curated TOPIC_OPTIONS, src/data/topics.ts). */}
            <div className="flex flex-wrap gap-2">
              {options.topic.map((topic) => (
                <TopicChip
                  key={topic}
                  label={topic}
                  active={filters.topic.includes(topic)}
                  onToggle={() => onToggle("topic", topic)}
                />
              ))}
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
          "done" is the natural forward action, not the destructive reset).
          Mobile pb: 16px, or the iPhone home-indicator inset where that's
          larger (the sheet sits flush with the screen bottom). max(), not
          24px + inset: stacking both read as a huge dead band in the
          installed PWA — same reasoning as the tab bar's padding. */}
      <div className="flex shrink-0 gap-3 border-t border-dc-hairline bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-4">
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
