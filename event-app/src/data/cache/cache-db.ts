import Dexie, { Table } from "dexie";

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
  toolCalls: { query: string; reason?: string }[];
  /** Retrieval rounds in order (round 0 = initial search). */
  rounds: InferenceRound[];
  /** Full context string handed to the model (from the `debug_context` event). */
  context: string;
  /** Final assistant answer (markdown). */
  answer: string;
  error?: string;
}

class CacheDB extends Dexie {
  cache!: Table<CacheEntry, string>;
  inferenceRuns!: Table<InferenceRun, string>;

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
  }
}

// Only create Dexie instance in browser environment
export const cacheDB =
  typeof window !== "undefined" ? new CacheDB() : (null as unknown as CacheDB);
