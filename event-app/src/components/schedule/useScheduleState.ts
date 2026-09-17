"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  // The day the user was on before a search steered them off it (see the
  // steer effect below), handed back when the query clears. null while not
  // steering; dropped on any explicit day choice, which must not be undone.
  const dayBeforeSearchRef = useRef<string | null>(null);
  const setSelectedDay = useCallback((key: string) => {
    setUserPickedDay(true);
    dayBeforeSearchRef.current = null;
    setSelectedDayState(key);
  }, []);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [interestedOnly, setInterestedOnly] = useState(false);

  // "Jump to now" crosses days: land on the day containing `now` — clamped to
  // the dataset's range (before day 1 → day 1, after the event → last day) —
  // and resume auto-following today, since the user just re-synced with the
  // clock. Days are sorted ascending, so the first key >= today is the clamp.
  const jumpToToday = () => {
    setUserPickedDay(false);
    dayBeforeSearchRef.current = null;
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

  const q = search.trim().toLowerCase();
  const hasQuery = q !== "";

  // Everything except the day check — interested, value facets, topics, query —
  // so the same rule can filter the selected day and count matches per day.
  const matchesSession = useMemo(() => {
    return (s: Session): boolean => {
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
    };
  }, [q, filters, interestedOnly, interestedIds]);

  // Every session on the selected day, before filters + search.
  const daySessionsAll = useMemo(
    () =>
      selectedDay ? sessions.filter((s) => dayKey(s) === selectedDay) : [],
    [sessions, selectedDay]
  );

  // Day's sessions after filters + search, grouped by start time.
  const groups: TimeGroup[] = useMemo(
    () => groupByTime(daySessionsAll.filter(matchesSession)),
    [daySessionsAll, matchesSession]
  );

  // The "live now" slot is decided by the whole day, not the filtered list:
  // the latest-starting group with a running session. A search that hides
  // that slot must not promote an earlier, still-running session (ongoing
  // in the unfiltered list) to "live now" — only results from this slot are.
  const liveSlotLabel = useMemo(() => {
    const all = groupByTime(daySessionsAll);
    const hasLive = all.map((g) =>
      g.sessions.some((s) => getStatus(s, now) === "live")
    );
    const i = hasLive.lastIndexOf(true);
    return i >= 0 ? all[i].timeLabel : null;
  }, [daySessionsAll, now]);

  // Is anything running right now, anywhere in the event? Unfiltered and
  // day-independent: it gates the mobile Live now pill, which exists to cross
  // days and land on the live slot, so it stays while another day is showing
  // and goes away between slots and outside the event.
  const anyLive = useMemo(
    () => sessions.some((s) => getStatus(s, now) === "live"),
    [sessions, now]
  );

  // Matches per day while a query is active — the tab badges, and which days
  // the tabs show at all. null with no query, and null when nothing matches
  // anywhere (every tab then stays visible, badge-free, and EmptyState
  // explains). Cheap predicate first: dayKey is an Intl format per call.
  const dayCounts = useMemo<ReadonlyMap<string, number> | null>(() => {
    if (!hasQuery) return null;
    const counts = new Map<string, number>();
    for (const s of sessions) {
      if (!matchesSession(s)) continue;
      const k = dayKey(s);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts.size > 0 ? counts : null;
  }, [hasQuery, sessions, matchesSession]);

  /** Matches across every day mid-search (the input's "N results"); null otherwise. */
  const totalMatches = useMemo(() => {
    if (!hasQuery) return null;
    if (!dayCounts) return 0;
    let n = 0;
    dayCounts.forEach((c) => (n += c));
    return n;
  }, [hasQuery, dayCounts]);

  // Days the tabs show: all of them, or only those with matches mid-search.
  const visibleDays = useMemo(
    () => (dayCounts ? days.filter((d) => dayCounts.has(d.key)) : days),
    [days, dayCounts]
  );

  // A search that leaves the selected day empty steers to the first day with
  // matches (temporary: `userPickedDay` untouched) and remembers where the
  // user was, so clearing the query lands them back there. A day that still
  // has matches is never switched under the user's typing.
  useEffect(() => {
    if (!dayCounts) {
      if (!hasQuery && dayBeforeSearchRef.current !== null) {
        const prev = dayBeforeSearchRef.current;
        dayBeforeSearchRef.current = null;
        if (days.some((d) => d.key === prev)) setSelectedDayState(prev);
      }
      return;
    }
    if (selectedDay !== null && dayCounts.has(selectedDay)) return;
    const first = visibleDays[0]?.key;
    if (!first) return;
    if (dayBeforeSearchRef.current === null) {
      dayBeforeSearchRef.current = selectedDay;
    }
    setSelectedDayState(first);
  }, [dayCounts, visibleDays, selectedDay, hasQuery, days]);

  // Follow "today" (venue time) until the user picks a day: the initial load
  // lands on today if the event is running (else day 1), and the tab advances
  // when the clock crosses venue midnight. "Today" derives from the mockable
  // `now`, so `?mockNow=` selects — and `mockSpeed` advances — the matching day.
  useEffect(() => {
    // The search owns the day while it is narrowing the tabs (steer effect
    // above); following the clock too would flip-flop between the two.
    if (dayCounts) return;
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
  }, [days, selectedDay, nowDate, userPickedDay, dayCounts]);

  // Live/past decoration per group, for the live band and completed collapse.
  const decoratedGroups: DecoratedGroup[] = useMemo(() => {
    const hasLive = groups.map((g) =>
      g.sessions.some((s) => getStatus(s, now) === "live")
    );
    const out: DecoratedGroup[] = [];
    groups.forEach((g, i) => {
      const isCurrentSlot = g.timeLabel === liveSlotLabel;
      if (hasLive[i] && !isCurrentSlot) {
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
          isLive: hasLive[i] && isCurrentSlot,
          isOngoing: false,
          isPast: g.sessions.every((s) => getStatus(s, now) === "past"),
        });
      }
    });
    return out;
  }, [groups, now, liveSlotLabel]);

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
    visibleDays,
    dayCounts,
    totalMatches,
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
    anyLive,
  };
}
