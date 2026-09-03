"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@/data/models";
import { useNow } from "@/hooks/useNow";
import { eventDayKey } from "@/data/eventTime";
import { deriveTopicOptions } from "@/data/topics";
import { dayKey, getDays, getStatus, groupByTime, type TimeGroup } from "./utils";

/** Facets a session can be filtered by (each multi-select). */
export type FilterFacet = "track" | "type" | "room" | "expertise" | "topic";
export type Filters = Record<FilterFacet, string[]>;

/** The single-valued facets — "topic" matches against the session's tags
 *  array instead, so it can't go through `sessionValue`. */
const VALUE_FACETS = ["track", "type", "room", "expertise"] as const;
type ValueFacet = (typeof VALUE_FACETS)[number];

const EMPTY: Filters = {
  track: [],
  type: [],
  room: [],
  expertise: [],
  topic: [],
};

function sessionValue(session: Session, facet: ValueFacet): string | undefined {
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
  interestedIds?: Set<string>,
  /**
   * Day selection to start from instead of "today" — the schedule passes its
   * pre-navigation snapshot here when the user comes back from a session or
   * speaker details page, so they land on the day they left.
   */
  initialDay?: { day: string | null; userPickedDay: boolean }
) {
  // Ticks every minute so "live"/"soon" status stays current (URL-mockable).
  // `nowDate` is null until the mock (if any) has resolved — day defaulting
  // waits for it so a cached session list can't race ahead with real time.
  const nowDate = useNow(60_000);
  const now = nowDate ? nowDate.getTime() : Date.now();
  const days = useMemo(() => getDays(sessions), [sessions]);

  const [selectedDay, setSelectedDayState] = useState<string | null>(
    initialDay?.day ?? null
  );
  // Sticky once the user taps a tab: auto-following "today" stops so the
  // clock (real or mocked) never fights an explicit choice.
  const [userPickedDay, setUserPickedDay] = useState(
    initialDay?.userPickedDay ?? false
  );
  const setSelectedDay = useCallback((key: string) => {
    setUserPickedDay(true);
    setSelectedDayState(key);
  }, []);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [interestedOnly, setInterestedOnly] = useState(false);

  // Follow "today" (venue time) until the user picks a day: the initial load
  // lands on today if the event is running (else day 1), and the tab advances
  // when the clock crosses venue midnight. "Today" derives from the mockable
  // `now`, so `?mockNow=` selects — and `mockSpeed` advances — the matching day.
  useEffect(() => {
    if (!nowDate || days.length === 0) return;
    const selectionValid =
      selectedDay != null && days.some((d) => d.key === selectedDay);
    if (userPickedDay && selectionValid) return;
    const todayKey = eventDayKey(nowDate.getTime());
    const today = days.find((day) => day.key === todayKey)?.key ?? null;
    // Outside the event (before day 1 / after the last day) keep whatever
    // valid day is showing; only the initial null falls back to day 1.
    const target = today ?? (selectionValid ? selectedDay : days[0].key);
    if (target !== selectedDay) setSelectedDayState(target);
  }, [days, selectedDay, nowDate, userPickedDay]);

  // "Jump to now" crosses days: land on the day containing `now` — clamped to
  // the dataset's range (before day 1 → day 1, after the event → last day) —
  // and resume auto-following today, since the user just re-synced with the
  // clock. Days are sorted ascending, so the first key >= today is the clamp.
  const jumpToToday = () => {
    setUserPickedDay(false);
    if (days.length === 0) return;
    const todayKey = eventDayKey(now);
    const target =
      days.find((d) => d.key >= todayKey)?.key ?? days[days.length - 1].key;
    setSelectedDayState(target);
  };

  const filterOptions = useMemo(() => {
    const opts: Record<FilterFacet, string[]> = {
      track: [],
      type: [],
      room: [],
      expertise: [],
      topic: [],
    };
    const seen: Record<ValueFacet, Set<string>> = {
      track: new Set(),
      type: new Set(),
      room: new Set(),
      expertise: new Set(),
    };
    for (const s of sessions) {
      VALUE_FACETS.forEach((f) => {
        const v = sessionValue(s, f);
        if (v && !seen[f].has(v)) {
          seen[f].add(v);
          opts[f].push(v);
        }
      });
    }
    VALUE_FACETS.forEach((f) => opts[f].sort());
    // Topics stay in frequency order (not alphabetical) — the same shared
    // vocabulary and ordering as the Speakers page's topic filter.
    opts.topic = deriveTopicOptions(sessions);
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
      for (const facet of VALUE_FACETS) {
        const sel = filters[facet];
        if (sel.length && !sel.includes(sessionValue(s, facet) ?? "")) {
          return false;
        }
      }
      // Topics are OR within the facet (any selected tag), AND with the rest —
      // matching the Speakers page's topic filter. Trimmed like the option
      // vocabulary, so a padded source tag still matches its option.
      if (
        filters.topic.length &&
        !(s.tags ?? []).some((raw) => filters.topic.includes(raw.trim()))
      ) {
        return false;
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

  // Every fully-completed group collapses behind the "Completed sessions"
  // panel — including ones that finished after a longer session started (the
  // carry-over split above already separates finished sessions from
  // still-running siblings), so the main list only ever shows live, ongoing
  // and upcoming sessions.
  const { completedGroups, visibleGroups } = useMemo(
    () => ({
      completedGroups: decoratedGroups.filter((g) => g.isPast),
      visibleGroups: decoratedGroups.filter((g) => !g.isPast),
    }),
    [decoratedGroups]
  );

  const completedCount = useMemo(
    () => completedGroups.reduce((n, g) => n + g.sessions.length, 0),
    [completedGroups]
  );

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
    userPickedDay,
    setSelectedDay,
    jumpToToday,
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
    interestedOnly,
    setInterestedOnly,
    daySessions,
    resultCount,
  };
}
