import Dexie, { Table } from "dexie";
import type {
  EventMetaRow,
  RoomRow,
  SessionRow,
  SpeakerRow,
} from "../store/types";

/** SWR keys of the pre-store catalogue caches, e.g. `@"devcon-7","sessions",`. */
const LEGACY_CATALOGUE_KEY = /"(sessions|speakers|rooms|event)"/;

interface CacheEntry {
  key: string;
  value: unknown;
  timestamp: number;
}

/** A single retrieved document within an inference debug run. */
export interface InferenceSource {
  source_id: string;
  source_repo: string;
  source_type?: string;
  similarity: number;
  content_preview: string;
  metadata?: Record<string, unknown>;
}

/** One retrieval round — the initial search, or a search the model triggered. */
export interface InferenceRound {
  label: string;
  documents: InferenceSource[];
}

/**
 * A saved RAG/inference debug run, surfaced by the admin "inference test"
 * viewer. Kept in IndexedDB (not localStorage) because a single run holds the
 * full retrieval context — often many KB — and we retain a rolling history.
 */
export interface InferenceRun {
  id: string;
  timestamp: number;
  query: string;
  /** True if this was a retrieval-only run (no LLM inference). */
  ragOnly?: boolean;
  /** Dataset filters the run was scoped to (empty = all). */
  sourceType?: string;
  sourceRepo?: string;
  /** Search tool invocations the model decided to make. */
  toolCalls: { query: string; reason?: string; source?: string }[];
  /** Retrieval rounds in order (round 0 = initial search). */
  rounds: InferenceRound[];
  /** Full context string handed to the model (from the `debug_context` event). */
  context: string;
  /** Final assistant answer (markdown). */
  answer: string;
  error?: string;
}

/** One message in a saved Deva chat conversation. */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * A saved Deva chatbot conversation. Persisted in IndexedDB (not localStorage)
 * so a user can close the app, go offline, and later resume or revisit any past
 * conversation. Browser-local and single-user — not synced.
 */
export interface Conversation {
  id: string;
  createdAt: number;
  /** Last activity — history is ordered by this (most recent first). */
  updatedAt: number;
  /** Display title, derived from the first user message. */
  title: string;
  messages: ConversationMessage[];
}

/**
 * An announcement the user has seen (inbox opened while it was visible).
 * Browser-local, like all read state here — never synced (cross-device "seen"
 * was never missed at previous events).
 */
export interface SeenAnnouncement {
  /** Announcement id (Notion page id). */
  id: string;
  seenAt: number;
}

/**
 * A session the user starred as "Interested". Browser-local user state (like
 * announcement read state) — never synced. Keyed per event so Devcon 7 test
 * stars don't bleed into Devcon 8.
 */
export interface InterestedSession {
  eventId: string;
  sessionId: string;
  addedAt: number;
}

/**
 * A speaker the user starred as "Interested" (speakers page). Kept separate
 * from `interested` (session stars) — mixing namespaced ids into one table
 * would corrupt the schedule's counts and filters.
 */
export interface InterestedSpeaker {
  eventId: string;
  speakerId: string;
  addedAt: number;
}

class CacheDB extends Dexie {
  cache!: Table<CacheEntry, string>;
  inferenceRuns!: Table<InferenceRun, string>;
  conversations!: Table<Conversation, string>;
  seenAnnouncements!: Table<SeenAnnouncement, string>;
  interested!: Table<InterestedSession, [string, string]>;
  interestedSpeakers!: Table<InterestedSpeaker, [string, string]>;
  // v7: normalised event catalogue (EventStore). One row per session /
  // speaker / room per event, plus one meta row (version, sync times).
  eventSessions!: Table<SessionRow, [string, string]>;
  eventSpeakers!: Table<SpeakerRow, [string, string]>;
  eventRooms!: Table<RoomRow, [string, string]>;
  eventMeta!: Table<EventMetaRow, string>;

  constructor() {
    super("SWRCacheDB");
    this.version(1).stores({
      cache: "&key, timestamp", // & = primary key, timestamp = index
    });
    // v2: admin inference-debug run history. Only the new table is declared;
    // Dexie carries `cache` forward unchanged.
    this.version(2).stores({
      inferenceRuns: "&id, timestamp",
    });
    // v3: Deva chatbot conversation history (resume / revisit past chats).
    this.version(3).stores({
      conversations: "&id, updatedAt",
    });
    // v4: announcement read state (unread badge survives offline/restarts).
    this.version(4).stores({
      seenAnnouncements: "&id",
    });
    // v5: "Interested" session stars (schedule), keyed per event.
    this.version(5).stores({
      interested: "&[eventId+sessionId], eventId",
    });
    // v6: "Interested" speaker stars (speakers page), keyed per event.
    this.version(6).stores({
      interestedSpeakers: "&[eventId+speakerId], eventId",
    });
    // v7: EventStore tables. The upgrade also deletes the old catalogue blobs
    // from the SWR `cache` table (keys like `@"devcon-7","sessions",`), which
    // were up to 1.8 MB per event and are superseded by these rows. Other
    // `cache` rows (announcements, tickets) are untouched.
    this.version(7)
      .stores({
        eventSessions: "&[eventId+id], eventId",
        eventSpeakers: "&[eventId+id], eventId",
        eventRooms: "&[eventId+id], eventId",
        eventMeta: "&eventId",
      })
      .upgrade((tx) =>
        tx
          .table("cache")
          .filter((row: { key: string }) => LEGACY_CATALOGUE_KEY.test(row.key))
          .delete()
      );
  }
}

// Only create Dexie instance in browser environment
export const cacheDB =
  typeof window !== "undefined" ? new CacheDB() : (null as unknown as CacheDB);
