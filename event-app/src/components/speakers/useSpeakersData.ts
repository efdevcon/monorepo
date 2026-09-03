"use client";

import { useMemo } from "react";
import { useEvent, useSessions, useSpeakers } from "@/data/hooks";
import type { Session, Speaker } from "@/data/models";
import { deriveTopicOptions } from "@/data/topics";

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
  /** Featured speaker: on the event's curated list, or (when the event has no
   * list) has a session carrying Pretalx's is_featured flag. */
  isFeatured: boolean;
  /** Grouping letter: uppercased first character, "#" for non A–Z. */
  letter: string;
}

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
  // Event record carries the organizer-curated featured speaker ids; the
  // event fetch is cached like everything else, so no extra loading state.
  const { event } = useEvent();

  // One memo for every derived collection: list consumers feed these straight
  // into their own memos, so identity churn here would re-filter the whole
  // page each render (project Set/Map-identity gotcha).
  const derived = useMemo(() => {
    const bySpeakerId = new Map<string, Session[]>();
    const typeSet = new Set<string>();

    for (const session of sessions) {
      const speakerRefs = session.speakers ?? [];
      for (const sp of speakerRefs) {
        const list = bySpeakerId.get(sp.id);
        if (list) list.push(session);
        else bySpeakerId.set(sp.id, [session]);
      }
      // The format-tab vocabulary comes from speakered sessions only — a type
      // that exists solely on speakerless sessions (breaks, ceremonies)
      // would render a tab that can never match any speaker.
      if (speakerRefs.length === 0) continue;
      if (session.type) typeSet.add(session.type);
    }

    // Event-level curation (Pretalx "Featured speaker" question) wins when
    // present; otherwise fall back to speakers with featured sessions.
    const featuredIds = event?.featuredSpeakers?.length
      ? new Set(event.featuredSpeakers)
      : null;

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
          isFeatured: featuredIds
            ? featuredIds.has(speaker.id)
            : own.some((s) => s.featured === true),
          letter: letterFor(speaker.name),
        };
      })
      .sort((a, b) => a.speaker.name.localeCompare(b.speaker.name));

    const byId = new Map(decorated.map((d) => [d.speaker.id, d]));

    // Shared topic vocabulary (top tags by frequency) — the desktop pill row
    // and the mobile "Filter by Topic" sheet show the same slice, and the
    // schedule Filters panel reuses the same derivation.
    const topicOptions = deriveTopicOptions(sessions);

    const typeOptions = [...typeSet].sort((a, b) => a.localeCompare(b));

    return { decorated, byId, topicOptions, typeOptions };
  }, [speakers, sessions, event]);

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
