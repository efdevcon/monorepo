import Dexie, { Table, type DexieOptions } from "dexie";
import type { FeedbackFileRef, FeedbackPayload } from "../feedback/types";
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
 * An inbox item the user has seen (inbox tab opened while it was visible).
 * Browser-local, like all read state here — never synced (cross-device "seen"
 * was never missed at previous events).
 */
export interface SeenAnnouncement {
  /** Announcement id (Notion page id), or `reminder:<sessionId>` for a session reminder. */
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
  /** When the star was first set on this device. */
  addedAt: number;
  /** False is a tombstone: unstarred, kept so the removal syncs and wins by time. */
  interested: boolean;
  /** Device time of the last change (ms); last write wins across devices. */
  updatedAt: number;
  /** 1 until the account has this change (0 once pushed, or when it came from the account). */
  pending: number;
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
  interested: boolean;
  updatedAt: number;
  pending: number;
}

/** Per account and event: the server cursor of the last completed interests sync. */
export interface InterestSyncMeta {
  /** `<userId>|<eventId>` */
  key: string;
  lastSyncAt: number;
}

/**
 * A small device-local preference or flag (src/data/prefs.ts). Generic on
 * purpose: one table for every key (notification preferences, onboarding
 * state, …) instead of a table per feature.
 */
export interface PrefRow {
  key: string;
  value: unknown;
}

/** A feedback report waiting for a connection (data/feedback/outbox.ts). */
export interface FeedbackOutboxRow {
  id: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
  payload: Omit<FeedbackPayload, "files">;
  files: { name: string; type: string; blob: Blob }[];
  /** Files already in the bucket from an earlier attempt, so a retry doesn't upload them again. */
  uploaded?: FeedbackFileRef[];
}

/** Where this session's data lives: IndexedDB, or memory when the browser has none. */
export type StorageMode = "persistent" | "memory";

/** The IndexedDB implementation Dexie opens: the browser's, or the in-memory engine. */
type StorageDeps = Pick<DexieOptions, "indexedDB" | "IDBKeyRange">;

class CacheDB extends Dexie {
  cache!: Table<CacheEntry, string>;
  inferenceRuns!: Table<InferenceRun, string>;
  conversations!: Table<Conversation, string>;
  seenAnnouncements!: Table<SeenAnnouncement, string>;
  interested!: Table<InterestedSession, [string, string]>;
  interestedSpeakers!: Table<InterestedSpeaker, [string, string]>;
  interestSync!: Table<InterestSyncMeta, string>;
  prefs!: Table<PrefRow, string>;
  feedbackOutbox!: Table<FeedbackOutboxRow, string>;
  // v7: normalised event catalogue (EventStore). One row per session /
  // speaker / room per event, plus one meta row (version, sync times).
  eventSessions!: Table<SessionRow, [string, string]>;
  eventSpeakers!: Table<SpeakerRow, [string, string]>;
  eventRooms!: Table<RoomRow, [string, string]>;
  eventMeta!: Table<EventMetaRow, string>;

  constructor(deps?: StorageDeps) {
    super("SWRCacheDB", deps);
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
    // v8: stars sync to the account (data/interested/sync.ts). Rows gain a
    // tombstone flag, a change time and a pending flag; existing stars become
    // pending so a first sign-in pushes them. `interestSync` holds the cursor.
    this.version(8)
      .stores({
        interested: "&[eventId+sessionId], eventId, pending",
        interestedSpeakers: "&[eventId+speakerId], eventId, pending",
        interestSync: "&key",
      })
      .upgrade(async (tx) => {
        const stamp = (row: { addedAt?: number; interested?: boolean; updatedAt?: number; pending?: number }) => {
          row.interested = true;
          row.updatedAt = row.addedAt ?? Date.now();
          row.pending = 1;
        };
        await tx.table("interested").toCollection().modify(stamp);
        await tx.table("interestedSpeakers").toCollection().modify(stamp);
      });
    // v9: generic device-local preferences, keyed by name (data/prefs.ts).
    this.version(9).stores({
      prefs: "&key",
    });
    // v10: feedback reports written offline, sent when the connection returns.
    this.version(10).stores({
      feedbackOutbox: "&id, createdAt",
    });
  }
}

/**
 * The app's database: null on the server and until `openCacheDB()` has run,
 * which the boot gate (`DataProvider`) does before anything under it renders.
 * The null cast keeps the call sites short; the `if (!cacheDB)` guards they
 * carry are for the server and for an engine that failed to load.
 */
export let cacheDB: CacheDB = null as unknown as CacheDB;
let storageMode: StorageMode | null = null;

/** How `openCacheDB()` opened the database; null before it ran or when it failed. */
export function currentStorageMode(): StorageMode | null {
  return storageMode;
}

/**
 * Open the database once. With IndexedDB this is synchronous work. Without
 * it (WebKit's Lockdown Mode removes IndexedDB from every browser on the
 * device since Safari 17, and Dexie then throws from the first `where()`),
 * the app loads an in-memory engine and runs on it for the session: every
 * Dexie call works, nothing survives a reload, and the boot gate says so.
 * If that engine fails to load, `cacheDB` stays null as on the server.
 */
export async function openCacheDB(): Promise<StorageMode | null> {
  if (cacheDB) return storageMode;
  const g = globalThis as { indexedDB?: unknown; IDBKeyRange?: unknown };
  if (g.indexedDB && g.IDBKeyRange) {
    cacheDB = withTabHandlers(new CacheDB());
    storageMode = "persistent";
    return storageMode;
  }
  try {
    const mem = await import(/* webpackChunkName: "memory-storage" */ "fake-indexeddb");
    cacheDB = withTabHandlers(new CacheDB({ indexedDB: mem.indexedDB, IDBKeyRange: mem.IDBKeyRange }));
    storageMode = "memory";
  } catch (err) {
    console.warn("[cache-db] no IndexedDB and the in-memory engine did not load; running without storage:", err);
  }
  return storageMode;
}

function withTabHandlers(db: CacheDB): CacheDB {
  // Two tabs on different app versions: the newer one needs this connection
  // closed to run its schema upgrade, otherwise it hangs "blocked" (its boot
  // gate times out and it runs without storage). Close here; every Dexie
  // call in this tab already tolerates failure (memory-only for the session).
  db.on("versionchange", () => {
    db.close();
    console.warn(
      "[cache-db] closed: a newer app version upgraded the database in another tab; reload to reopen storage"
    );
  });
  db.on("blocked", () => {
    console.warn("[cache-db] schema upgrade blocked by another open tab of this app");
  });
  return db;
}

/**
 * Drop the catalogue rows of every event except `keep` (the active dataset
 * and its Community Hubs programme). The default dataset moved from devcon-7
 * to devcon8 on 2026-10-15, and a switch through the internal tools leaves
 * the previous event's rows behind too: about 1 MB per event that nothing
 * reads any more. Best effort, after the boot hydrate; a failure only logs.
 */
export async function pruneOtherEventRows(keep: string[]): Promise<void> {
  if (!cacheDB) return;
  try {
    await cacheDB.transaction(
      "rw",
      [cacheDB.eventSessions, cacheDB.eventSpeakers, cacheDB.eventRooms, cacheDB.eventMeta],
      async () => {
        await Promise.all([
          cacheDB.eventSessions.where("eventId").noneOf(keep).delete(),
          cacheDB.eventSpeakers.where("eventId").noneOf(keep).delete(),
          cacheDB.eventRooms.where("eventId").noneOf(keep).delete(),
          cacheDB.eventMeta.where("eventId").noneOf(keep).delete(),
        ]);
      }
    );
  } catch (err) {
    console.warn("[cache] could not prune other events' rows:", err);
  }
}
