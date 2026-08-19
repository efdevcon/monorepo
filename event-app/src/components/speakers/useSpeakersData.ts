"use client";

import { useMemo } from "react";
import { useSessions, useSpeakers } from "@/data/hooks";
import type { Session, Speaker } from "@/data/models";
import { isKeynoteSession } from "@/components/schedule/utils";

/**
 * A speaker joined with their sessions. The API's speaker list carries none of
 * this (no sessions/tracks/tags), so everything derives client-side from the
 * cached sessions list — offline-safe, since both lists live in the Dexie/SWR
 * cache.
 */
export interface DecoratedSpeaker {
  speaker: Speaker;
  /** This speaker's sessions, sorted by start time. */
  sessions: Session[];
  sessionCount: number;
  /** Alphabetical union of the sessions' topic tags. */
  tags: string[];
  /** Distinct session types (drives the format tabs). */
  types: string[];
  /** Has at least one keynote session. */
  isKeynote: boolean;
  /** Grouping letter: uppercased first character, "#" for non A–Z. */
  letter: string;
}

/** How many topic pills the filter row offers (top tags by frequency). */
const TOPIC_PILL_COUNT = 15;

const letterFor = (name: string): string => {
  // Strip diacritics first so "Étienne" groups under E (and stays contiguous
  // with the locale-aware name sort, which also treats É as E).
  const c = name
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .charAt(0)
    .toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
};

/**
 * Speakers × sessions join for the speakers page: decorated speakers sorted by
 * name, plus the derived filter vocabularies (topic pills = the dataset's most
 * frequent session tags; format tabs = distinct session types).
 */
export function useSpeakersData() {
  const {
    speakers,
    isLoading: speakersLoading,
    error: speakersError,
  } = useSpeakers();
  const {
    sessions,
    isLoading: sessionsLoading,
    error: sessionsError,
  } = useSessions();

  // One memo for every derived collection: list consumers feed these straight
  // into their own memos, so identity churn here would re-filter the whole
  // page each render (project Set/Map-identity gotcha).
  const derived = useMemo(() => {
    const bySpeakerId = new Map<string, Session[]>();
    const tagCounts = new Map<string, number>();
    const typeSet = new Set<string>();

    for (const session of sessions) {
      const speakerRefs = session.speakers ?? [];
      for (const sp of speakerRefs) {
        const list = bySpeakerId.get(sp.id);
        if (list) list.push(session);
        else bySpeakerId.set(sp.id, [session]);
      }
      // Filter vocabularies come from speakered sessions only — a tag/type
      // that exists solely on speakerless sessions (breaks, ceremonies)
      // would render a pill that can never match any speaker.
      if (speakerRefs.length === 0) continue;
      for (const raw of session.tags ?? []) {
        const tag = raw.trim();
        if (!tag) continue;
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
      if (session.type) typeSet.add(session.type);
    }

    const decorated: DecoratedSpeaker[] = speakers
      .map((speaker) => {
        const own = (bySpeakerId.get(speaker.id) ?? []).sort(
          (a, b) => a.start - b.start
        );
        const tags = [
          ...new Set(
            own.flatMap((s) => s.tags ?? []).map((t) => t.trim())
          ),
        ]
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        const types = [...new Set(own.map((s) => s.type))].filter(
          (t): t is string => !!t
        );
        return {
          speaker,
          sessions: own,
          sessionCount: own.length,
          tags,
          types,
          isKeynote: own.some(isKeynoteSession),
          letter: letterFor(speaker.name),
        };
      })
      .sort((a, b) => a.speaker.name.localeCompare(b.speaker.name));

    const byId = new Map(decorated.map((d) => [d.speaker.id, d]));

    // All topics by frequency (most useful first) — the mobile "Filter by
    // Topic" sheet lists everything; the desktop pill row shows the top slice.
    const allTopicOptions = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
    const topicOptions = allTopicOptions.slice(0, TOPIC_PILL_COUNT);

    const typeOptions = [...typeSet].sort((a, b) => a.localeCompare(b));

    return { decorated, byId, topicOptions, allTopicOptions, typeOptions };
  }, [speakers, sessions]);

  // The join needs BOTH halves: loading until each list has data (otherwise
  // a speakers-first resolve renders every card as "0 sessions" with empty
  // filter vocabularies), and offline-first on errors — a failed half only
  // surfaces when it has no cached data to join (never hide data we have).
  const error =
    (speakers.length === 0 && speakersError) ||
    (sessions.length === 0 && sessionsError) ||
    undefined;
  return {
    ...derived,
    isLoading:
      (speakersLoading && speakers.length === 0) ||
      (sessionsLoading && sessions.length === 0),
    isError: error,
    error,
  };
}
