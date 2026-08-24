"use client";

import { Star } from "lucide-react";

/**
 * Empty state for the speakers list, in two flavours:
 *
 * - Nothing starred yet (the interested filter is the only thing narrowing
 *   the list): not a failed search, so it explains how starring works and
 *   offers a way back to everyone. The search meme would read as a lie here —
 *   the words "NO SEARCH RESULTS FOUND" are baked into the image — so this
 *   variant uses a star mark instead.
 * - No results (Figma "No speaker found"): the meme image, a heading echoing
 *   the query, and a purple "Try again?" link that clears search + filters.
 */
export function SpeakersEmptyState({
  query,
  topicFiltersActive,
  interestedOnly,
  onReset,
}: {
  query: string;
  /** Any topic/format filter set — without one (or a query) the reset
   *  button would be a no-op lie. */
  topicFiltersActive: boolean;
  /** The "interested only" toggle. */
  interestedOnly: boolean;
  onReset: () => void;
}) {
  const hasQuery = query.trim().length > 0;
  const resettable = hasQuery || topicFiltersActive || interestedOnly;
  // Starring is the only active narrowing: the list isn't failing to find
  // anything, the user simply hasn't saved anyone yet.
  const noStarsYet = interestedOnly && !hasQuery && !topicFiltersActive;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      {noStarsYet ? (
        <span className="flex size-16 items-center justify-center rounded-full bg-dc-lavender">
          <Star className="size-7 text-dc-purple" fill="currentColor" />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/schedule/empty-search.webp"
          alt=""
          className="w-[200px] max-w-full"
        />
      )}
      <div className="flex w-full min-w-0 flex-col gap-1 text-dc-fg">
        <p className="w-full truncate text-[20px] font-bold leading-[28.8px] tracking-[-0.5px]">
          {noStarsYet
            ? "No starred speakers yet"
            : hasQuery
              ? `No speakers found for ‘${query.trim()}’`
              : "No speakers found"}
        </p>
        <p className="text-[16px] leading-6">
          {noStarsYet ? (
            <>
              Tap the star on any speaker to save them here.{" "}
              <button
                onClick={onReset}
                className="cursor-pointer font-bold text-dc-purple"
              >
                Show all speakers
              </button>
            </>
          ) : (
            <>
              Maybe they aren’t speaking at Devcon. Maybe it’s just a typo.{" "}
              {resettable && (
                <button
                  onClick={onReset}
                  className="cursor-pointer font-bold text-dc-purple"
                >
                  Try again?
                </button>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
