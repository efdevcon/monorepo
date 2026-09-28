"use client";

import { Star } from "lucide-react";

/**
 * Empty state for the schedule list, in two flavours (mirrors
 * SpeakersEmptyState):
 *
 * - My Interests is the only narrowing: not a failed search, so it explains
 *   starring (nothing saved yet) or says the saved sessions are on other days,
 *   with a way back to everything. The meme has "NO SEARCH RESULTS FOUND"
 *   baked in, so this variant uses the star mark instead.
 * - No results (Figma "No sessions found"): the meme image, a heading echoing
 *   the query, and a purple "Try again?" link that clears search+filters.
 */
export function EmptyState({
  query,
  filtersActive,
  interestsOnly,
  interestedCount,
  onReset,
}: {
  query: string;
  /** Whether any filter/search/interested toggle is set — without one, the
   *  filter-blaming copy and the clear-filters button would be a no-op lie. */
  filtersActive: boolean;
  /** My Interests is on and nothing else (no query, no facets) is set. */
  interestsOnly: boolean;
  /** Saved sessions, event-wide. */
  interestedCount: number;
  onReset: () => void;
}) {
  const hasQuery = query.trim().length > 0;
  const resettable = hasQuery || filtersActive;

  if (interestsOnly) {
    const noneSaved = interestedCount === 0;
    return (
      <div className="flex w-full flex-col items-center justify-center gap-6 px-4 py-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-dc-lavender">
          <Star className="size-7 text-dc-purple" fill="currentColor" />
        </span>
        <div className="flex w-full min-w-0 flex-col gap-1 text-dc-fg">
          <p className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px]">
            {noneSaved ? "Nothing in My Interests yet" : "No interests on this day"}
          </p>
          <p className="text-[16px] leading-6 text-dc-muted">
            {noneSaved
              ? "Tap the star on any session to save it here. "
              : `Your ${interestedCount} saved ${interestedCount === 1 ? "session is" : "sessions are"} on other days. `}
            <button
              onClick={onReset}
              className="cursor-pointer font-bold text-dc-purple"
            >
              Show all sessions
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/schedule/empty-search.gif"
        alt=""
        className="w-[200px] max-w-full"
      />
      <div className="flex w-full min-w-0 flex-col gap-1 text-dc-fg">
        <p className="w-full truncate text-[20px] font-bold leading-[28.8px] tracking-[-0.5px]">
          {hasQuery
            ? `No sessions found for ‘${query.trim()}’`
            : "No sessions found"}
        </p>
        <p className="text-[16px] leading-6 text-dc-muted">
          {hasQuery
            ? "It looks like we don’t have any sessions related to that. "
            : filtersActive
              ? "Nothing matches the current filters. "
              : "There are no sessions to show for this day."}
          {resettable && (
            <button
              onClick={onReset}
              className="cursor-pointer font-bold text-dc-purple"
            >
              Try again?
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
