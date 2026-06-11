"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@/data/models";
import { useNowMs } from "@/hooks/useNow";
import { dayKey, getDays, groupByTime, type TimeGroup } from "./utils";

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

/**
 * All schedule view state and derivations in one place, kept isolated from the
 * rendering components: selected day, search, multi-select filters, the
 * available filter options, and the time-grouped, filtered sessions.
 */
export function useScheduleState(sessions: Session[]) {
  // Ticks every minute so "live"/"soon" status stays current (URL-mockable).
  const now = useNowMs(60_000);
  const days = useMemo(() => getDays(sessions), [sessions]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);

  // Default to today if the event is running, otherwise the first day.
  useEffect(() => {
    if (selectedDay && days.some((d) => d.key === selectedDay)) return;
    if (days.length === 0) return;
    const todayKey = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    })();
    setSelectedDay(days.find((d) => d.key === todayKey)?.key ?? days[0].key);
  }, [days, selectedDay]);

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
  };

  const activeFilterCount =
    Object.values(filters).reduce((n, arr) => n + arr.length, 0) +
    (search.trim() ? 1 : 0);

  // Day's sessions after filters + search, grouped by start time.
  const groups: TimeGroup[] = useMemo(() => {
    if (!selectedDay) return [];
    const q = search.trim().toLowerCase();
    const matches = sessions.filter((s) => {
      if (dayKey(s) !== selectedDay) return false;
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
  }, [sessions, selectedDay, filters, search]);

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
    filterOptions,
    groups,
    daySessions,
    resultCount,
  };
}
