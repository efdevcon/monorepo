"use client";

/**
 * No-results state (Figma "No sessions found"): the meme image, a heading
 * echoing the query, and a purple "Try again?" link that clears search+filters.
 */
export function EmptyState({
  query,
  filtersActive,
  onReset,
}: {
  query: string;
  /** Whether any filter/search/interested toggle is set — without one, the
   *  filter-blaming copy and the clear-filters button would be a no-op lie. */
  filtersActive: boolean;
  onReset: () => void;
}) {
  const hasQuery = query.trim().length > 0;
  const resettable = hasQuery || filtersActive;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/schedule/empty-search.webp"
        alt=""
        className="w-[200px] max-w-full"
      />
      <div className="flex w-full min-w-0 flex-col gap-1 text-dc-fg">
        <p className="w-full truncate text-[20px] font-bold leading-[28.8px] tracking-[-0.5px]">
          {hasQuery
            ? `No sessions found for ‘${query.trim()}’`
            : "No sessions found"}
        </p>
        <p className="text-[16px] leading-6">
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
