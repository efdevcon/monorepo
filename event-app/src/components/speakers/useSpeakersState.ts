"use client";

import { useMemo, useState } from "react";
import type { Speaker } from "@/data/models";

/** Lowercase + strip diacritics for accent-insensitive search. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const firstLetter = (name: string) => name.trim()[0]?.toUpperCase() ?? "";

/**
 * Speakers list state: a search query and an A–Z letter filter, plus the
 * derived (sorted, filtered) speaker list and the set of available letters.
 */
export function useSpeakersState(speakers: Speaker[]) {
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState("");

  const sorted = useMemo(
    () => [...speakers].sort((a, b) => a.name.localeCompare(b.name)),
    [speakers]
  );

  const letters = useMemo(() => {
    const set = new Set<string>();
    for (const s of sorted) {
      const c = firstLetter(s.name);
      if (c) set.add(c);
    }
    return [...set].sort();
  }, [sorted]);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return sorted.filter((s) => {
      if (letter && firstLetter(s.name) !== letter) return false;
      if (q) {
        const haystack = normalize(
          [s.name, s.role, s.company].filter(Boolean).join(" ")
        );
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [sorted, search, letter]);

  return { search, setSearch, letter, setLetter, letters, filtered };
}
