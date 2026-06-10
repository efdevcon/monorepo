"use client";

import { Search } from "lucide-react";
import cn from "classnames";
import { useSpeakers } from "@/data/hooks";
import { SpeakerCard } from "./SpeakerCard";
import { useSpeakersState } from "./useSpeakersState";

/**
 * Speakers list — devcon-inspired: a search box, an A–Z letter filter, and a
 * grid of avatar cards. View state lives in `useSpeakersState`.
 */
export function Speakers() {
  const { speakers, isLoading, isError, error } = useSpeakers();
  const { search, setSearch, letter, setLetter, letters, filtered } =
    useSpeakersState(speakers);

  return (
    <main className="py-6">
      <h1 className="mb-4 text-2xl font-bold">Speakers</h1>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search speakers…"
          className="w-full rounded-xl border border-[#E1E4EA] py-2.5 pl-9 pr-3 outline-none focus:border-[#7D52F4]"
        />
      </div>

      {/* A–Z filter */}
      {letters.length > 1 && (
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setLetter("")}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
              letter === ""
                ? "border-[#7D52F4] bg-[#f3eeff] text-[#7D52F4]"
                : "border-[#E1E4EA] text-gray-600 hover:bg-gray-50"
            )}
          >
            All
          </button>
          {letters.map((l) => (
            <button
              key={l}
              onClick={() => setLetter(l)}
              className={cn(
                "h-8 w-8 shrink-0 rounded-full border text-sm transition-colors",
                letter === l
                  ? "border-[#7D52F4] bg-[#f3eeff] text-[#7D52F4]"
                  : "border-[#E1E4EA] text-gray-600 hover:bg-gray-50"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {/* States */}
      {isLoading && speakers.length === 0 ? (
        <p className="py-12 text-center text-gray-500">Loading speakers…</p>
      ) : isError ? (
        <p className="py-12 text-center text-red-500">
          {error?.message ?? "Failed to load speakers."}
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-gray-500">
          No speakers match your search.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((speaker) => (
            <SpeakerCard key={speaker.id} speaker={speaker} />
          ))}
        </div>
      )}
    </main>
  );
}
