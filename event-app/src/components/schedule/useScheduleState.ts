"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@/data/models";
import { useNow } from "@/hooks/useNow";
import { dayKey, getDays, getStatus, groupByTime, type TimeGroup } from "./utils";

/** Facets a session can be filtered by (each multi-select). */
export type FilterFacet = "track" | "type" | "room" | "expertise";
export type Filters = Record<FilterFacet, string[]>;

const EMPTY: Filters = { track: [], type: [], room: [], expertise: [] };

function sessionValue(session: Session, facet: FilterFacet): string | undefined {
  switch (facet) {
    case "track":
      return session.track;
    case "type":
      return session.type;
    case "room":
      return session.room?.name;
    case "expertise":
      return session.expertise;
  }
}

/** A time group decorated with live/past status for the redesigned list. */
export interface DecoratedGroup extends TimeGroup {
  /**
   * Unique render/ref key. Usually the timeLabel, but a slot whose sessions
   * are part-finished, part-still-running splits into a completed group and
   * an ongoing group sharing one timeLabel.
   */
  key: string;
  /**
   * This group is the current live slot: the latest-starting group with a
   * live session. At most one group is live at a time, so the red band
   * anchors the present moment instead of trailing long-running sessions.
   */
  isLive: boolean;
  /**
   * Every session in this group is still running past its slot — a later
   * slot has since become the live one (e.g. a 90-min workshop outlasting
   * lightning talks). Finished siblings are split out into their own
   * completed group so "ongoing" is never diluted with checked-off sessions.
   */
  isOngoing: boolean;
  /** Every session in the group has ended. */
  isPast: boolean;
}

/**
 * All schedule view state and derivations in one place, kept isolated from the
 * rendering components: selected day, search, multi-select filters, the
 * available filter options, and the time-grouped, filtered sessions.
 *
 * `interestedIds` (from useInterested) is optional and only consulted when the
 * "Interested" toggle is on — data fetching and shapes are untouched.
 */
export function useScheduleState(
  sessions: Session[],
  interestedIds?: Set<string>
) {
  // Ticks every minute so "live"/"soon" status stays current (URL-mockable).
  // `nowDate` is null until the mock (if any) has resolved — day defaulting
  // waits for it so a cached session list can't race ahead with real time.
  const nowDate = useNow(60_000);
  const now = nowDate ? nowDate.getTime() : Date.now();
  const days = useMemo(() => getDays(sessions), [sessions]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [interestedOnly, setInterestedOnly] = useState(false);

  // Default to today if the event is running, otherwise the first day.
  // "Today" derives from the mockable `now`, so `?mockNow=` selects the
  // matching day (a raw `new Date()` here used to break that).
  useEffect(() => {
    if (!nowDate) return;
    if (selectedDay && days.some((d) => d.key === selectedDay)) return;
    if (days.length === 0) return;
    const todayKey = `${nowDate.getFullYear()}-${nowDate.getMonth() + 1}-${nowDate.getDate()}`;
    setSelectedDay(days.find((day) => day.key === todayKey)?.key ?? days[0].key);
  }, [days, selectedDay, nowDate]);

  const filterOptions = useMemo(() => {
    const opts: Record<FilterFacet, string[]> = {
      track: [],
      type: [],
      room: [],
      expertise: [],
    };
    const seen: Record<FilterFacet, Set<string>> = {
      track: new Set(),
      type: new Set(),
      room: new Set(),
      expertise: new Set(),
    };
    for (const s of sessions) {
      (["track", "type", "room", "expertise"] as FilterFacet[]).forEach((f) => {
        const v = sessionValue(s, f);
        if (v && !seen[f].has(v)) {
          seen[f].add(v);
          opts[f].push(v);
        }
      });
    }
    (Object.keys(opts) as FilterFacet[]).forEach((f) => opts[f].sort());
    return opts;
  }, [sessions]);

  const toggleFilter = (facet: FilterFacet, value: string) =>
    setFilters((prev) => {
      const active = prev[facet].includes(value);
      return {
        ...prev,
        [facet]: active
          ? prev[facet].filter((v) => v !== value)
          : [...prev[facet], value],
      };
    });

  const clearFilters = () => {
    setFilters(EMPTY);
    setSearch("");
    setInterestedOnly(false);
  };

  const activeFilterCount =
    Object.values(filters).reduce((n, arr) => n + arr.length, 0) +
    (search.trim() ? 1 : 0) +
    (interestedOnly ? 1 : 0);

  /** Facet selections only (excludes search/interested) — for the status bar. */
  const facetFilterCounts = useMemo(() => {
    const counts: Partial<Record<FilterFacet, number>> = {};
    (Object.keys(filters) as FilterFacet[]).forEach((f) => {
      if (filters[f].length > 0) counts[f] = filters[f].length;
    });
    return counts;
  }, [filters]);

  // Day's sessions after filters + search, grouped by start time.
  const groups: TimeGroup[] = useMemo(() => {
    if (!selectedDay) return [];
    const q = search.trim().toLowerCase();
    const matches = sessions.filter((s) => {
      if (dayKey(s) !== selectedDay) return false;
      if (interestedOnly && !(interestedIds?.has(s.id) ?? false)) return false;
      for (const facet of ["track", "type", "room", "expertise"] as FilterFacet[]) {
        const sel = filters[facet];
        if (sel.length && !sel.includes(sessionValue(s, facet) ?? "")) {
          return false;
        }
      }
      if (q) {
        const haystack = [
          s.title,
          s.description,
          s.track,
          s.type,
          s.room?.name,
          ...s.speakers.map((sp) => sp.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    return groupByTime(matches);
  }, [sessions, selectedDay, filters, search, interestedOnly, interestedIds]);

  // Live/past decoration per group, for the live band and completed collapse.
  const decoratedGroups: DecoratedGroup[] = useMemo(() => {
    const hasLive = groups.map((g) =>
      g.sessions.some((s) => getStatus(s, now) === "live")
    );
    const currentSlot = hasLive.lastIndexOf(true);
    const out: DecoratedGroup[] = [];
    groups.forEach((g, i) => {
      if (hasLive[i] && i !== currentSlot) {
        // Carry-over slot: its sessions all started together, so each is
        // either still running or already over. Completed ones split into
        // their own checked-off group (first, so a leading run can collapse);
        // only the still-running ones carry the Ongoing tag.
        const done = g.sessions.filter((s) => getStatus(s, now) === "past");
        const running = g.sessions.filter(
          (s) => getStatus(s, now) === "live"
        );
        if (done.length > 0) {
          out.push({
            ...g,
            sessions: done,
            key: g.timeLabel,
            isLive: false,
            isOngoing: false,
            isPast: true,
          });
        }
        out.push({
          ...g,
          sessions: running,
          key: `${g.timeLabel}-ongoing`,
          isLive: false,
          isOngoing: true,
          isPast: false,
        });
      } else {
        out.push({
          ...g,
          key: g.timeLabel,
          isLive: i === currentSlot,
          isOngoing: false,
          isPast: g.sessions.every((s) => getStatus(s, now) === "past"),
        });
      }
    });
    return out;
  }, [groups, now]);

  // Leading fully-completed groups collapse behind a summary bar (Figma 3a/3b).
  const { completedGroups, visibleGroups } = useMemo(() => {
    let i = 0;
    while (i < decoratedGroups.length && decoratedGroups[i].isPast) i++;
    return {
      completedGroups: decoratedGroups.slice(0, i),
      visibleGroups: decoratedGroups.slice(i),
    };
  }, [decoratedGroups]);

  const completedCount = useMemo(
    () => completedGroups.reduce((n, g) => n + g.sessions.length, 0),
    [completedGroups]
  );
  const completedUntilLabel = visibleGroups[0]?.timeLabel ?? null;

  // Flat, filtered sessions for the selected day (timeline view needs them
  // ungrouped). Derived from the same groups so filters/search stay in sync.
  const daySessions = useMemo(
    () => groups.flatMap((g) => g.sessions),
    [groups]
  );

  const resultCount = daySessions.length;

  return {
    now,
    days,
    selectedDay,
    setSelectedDay,
    search,
    setSearch,
    filters,
    toggleFilter,
    clearFilters,
    activeFilterCount,
    facetFilterCounts,
    filterOptions,
    groups,
    decoratedGroups,
    completedGroups,
    visibleGroups,
    completedCount,
    completedUntilLabel,
    interestedOnly,
    setInterestedOnly,
    daySessions,
    resultCount,
  };
}
