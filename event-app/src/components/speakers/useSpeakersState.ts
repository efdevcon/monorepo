"use client";

import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { DecoratedSpeaker } from "./useSpeakersData";

/** Lowercase + strip diacritics for accent-insensitive search. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** A letter section in A–Z mode. */
export interface LetterGroup {
  letter: string;
  speakers: DecoratedSpeaker[];
}

/**
 * Speakers list view state: search, topic multi-select, format tab,
 * interested-only toggle and the A–Z index mode, plus the derived filtered
 * list, keynote subset and letter groups. Input `all` is name-sorted (from
 * useSpeakersData), so every derived list stays sorted for free.
 */
export function useSpeakersState(
  all: DecoratedSpeaker[],
  interestedIds: Set<string>
) {
  const [search, setSearch] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [type, setType] = useState<string | null>(null);
  const [interestedOnly, setInterestedOnly] = useState(false);
  const [azMode, setAzModeState] = useState(false);

  const toggleTopic = useCallback((topic: string) => {
    setTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : [...prev, topic]
    );
  }, []);

  // Entering A–Z mode hides the topic/format rows, so their filters must
  // reset — an invisible active filter would silently shrink the index.
  // Search and interested-only stay: both remain visible in the A–Z top bar.
  const setAzMode = useCallback((v: boolean) => {
    setAzModeState(v);
    if (v) {
      setTopics([]);
      setType(null);
    }
  }, []);

  const clearAll = useCallback(() => {
    setSearch("");
    setTopics([]);
    setType(null);
    setInterestedOnly(false);
  }, []);

  // Gate the star-set dependency on the toggle: while interested-only is off,
  // star churn must not re-filter (and re-group) the whole list.
  const interestedFilter = interestedOnly ? interestedIds : null;
  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return all.filter((d) => {
      if (interestedFilter && !interestedFilter.has(d.speaker.id))
        return false;
      if (type && !d.types.includes(type)) return false;
      if (topics.length > 0 && !topics.some((t) => d.tags.includes(t)))
        return false;
      if (q && !normalize(d.speaker.name).includes(q)) return false;
      return true;
    });
  }, [all, search, topics, type, interestedFilter]);

  const keynoteSpeakers = useMemo(
    () => filtered.filter((d) => d.isKeynote),
    [filtered]
  );

  // Group via a Map rather than a consecutive scan: the locale-aware name
  // sort doesn't always keep letters contiguous (symbols and some collation
  // quirks interleave), and a scan would then emit duplicate letter keys.
  const letterGroups = useMemo(() => {
    const byLetter = new Map<string, DecoratedSpeaker[]>();
    for (const d of filtered) {
      const group = byLetter.get(d.letter);
      if (group) group.push(d);
      else byLetter.set(d.letter, [d]);
    }
    // "#" (non A–Z names) leads, then A–Z; within a group the name sort holds.
    return [...byLetter.entries()]
      .sort(([a], [b]) =>
        a === b ? 0 : a === "#" ? -1 : b === "#" ? 1 : a.localeCompare(b)
      )
      .map(([letter, speakers]) => ({ letter, speakers }));
  }, [filtered]);

  const letters = useMemo(
    () => letterGroups.map((g) => g.letter),
    [letterGroups]
  );

  const activeFilterCount = topics.length + (type ? 1 : 0);

  return {
    search,
    setSearch,
    topics,
    toggleTopic,
    type,
    setType,
    interestedOnly,
    setInterestedOnly: setInterestedOnly as Dispatch<SetStateAction<boolean>>,
    azMode,
    setAzMode,
    clearAll,
    activeFilterCount,
    filtered,
    resultCount: filtered.length,
    keynoteSpeakers,
    letterGroups,
    letters,
  };
}
