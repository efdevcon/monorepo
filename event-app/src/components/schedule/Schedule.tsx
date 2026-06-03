"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import cn from "classnames";
import { useSessions } from "@/data/hooks";
import { DayTabs } from "./DayTabs";
import { ScheduleFilters } from "./ScheduleFilters";
import { SessionCard } from "./SessionCard";
import { useScheduleState } from "./useScheduleState";

/**
 * Self-contained schedule view: day selector, search, multi-select filters and
 * a time-grouped session list with sticky time headers and live/soon status.
 * All view state lives in `useScheduleState`; rendering is split across
 * `DayTabs`, `ScheduleFilters`, and `SessionCard` so each stays small.
 */
export function Schedule() {
  const { sessions, isLoading, isError, error } = useSessions();
  const {
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
    resultCount,
  } = useScheduleState(sessions);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Schedule</h1>

      {/* Search + filter toggle */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions, speakers…"
            className="w-full rounded-xl border border-[#E1E4EA] py-2.5 pl-9 pr-3 outline-none focus:border-[#7D52F4]"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className={cn(
            "relative inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 font-medium transition-colors",
            filtersOpen || activeFilterCount > 0
              ? "border-[#7D52F4] text-[#7D52F4]"
              : "border-[#E1E4EA] text-gray-600 hover:bg-gray-50"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-[#7D52F4] px-1.5 text-xs text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {filtersOpen && (
        <div className="mb-4">
          <ScheduleFilters
            options={filterOptions}
            filters={filters}
            onToggle={toggleFilter}
            onClear={clearFilters}
            activeCount={activeFilterCount}
          />
        </div>
      )}

      <div className="mb-4">
        <DayTabs
          days={days}
          selectedDay={selectedDay}
          onSelect={setSelectedDay}
        />
      </div>

      {/* States */}
      {isLoading && sessions.length === 0 ? (
        <p className="py-12 text-center text-gray-500">Loading schedule…</p>
      ) : isError ? (
        <p className="py-12 text-center text-red-500">
          {error?.message ?? "Failed to load the schedule."}
        </p>
      ) : resultCount === 0 ? (
        <p className="py-12 text-center text-gray-500">
          {activeFilterCount > 0
            ? "No sessions match your filters."
            : "No sessions scheduled for this day."}
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.timeLabel}>
              <h2 className="sticky top-0 z-10 bg-white/90 py-1.5 text-sm font-semibold text-[#939393] backdrop-blur">
                {group.timeLabel}
              </h2>
              <div className="space-y-3">
                {group.sessions.map((session) => (
                  <SessionCard key={session.id} session={session} nowMs={now} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
