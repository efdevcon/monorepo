import { cacheDB } from "../cache/cache-db";
import type { Dataset } from "../dataset";
import { provider } from "../providers/provider";
import type { IEventDataProvider } from "../providers/provider-interface";
import { validateWithToast } from "../providers/validation";
import { emptySnapshot, materialize } from "./materialize";
import { normalizeBundle } from "./normalize";
import {
  BundleSchema,
  type EventBundle,
  type EventMetaRow,
  type EventSnapshot,
} from "./types";

export type SyncStatus = "idle" | "syncing" | "offline" | "error";
export type SyncResult = "unchanged" | "updated" | "failed";

export interface StoreState {
  snapshot: EventSnapshot;
  meta: EventMetaRow | null;
  status: SyncStatus;
  /** True once the Dexie rows for the active event have been read (or found absent). */
  hydrated: boolean;
  /** Boot hydrate duration, for the debug panel and the acceptance table. */
  hydrateMs: number | null;
  lastError: string | null;
}

/** Stable server-side state for useSyncExternalStore's getServerSnapshot. */
export const SERVER_STATE: StoreState = {
  snapshot: emptySnapshot(""),
  meta: null,
  status: "idle",
  hydrated: false,
  hydrateMs: null,
  lastError: null,
};

export function shouldFetch(
  remoteVersion: string,
  localVersion: string | null,
  force: boolean
): boolean {
  if (force) return true;
  if (localVersion === null) return true;
  return remoteVersion !== localVersion;
}

/** Structural check that runs in production too (zod validation is dev-only). */
export function isBundleShaped(x: unknown): x is EventBundle {
  if (!x || typeof x !== "object") return false;
  const b = x as Record<string, unknown>;
  return (
    typeof b.version === "string" &&
    Array.isArray(b.sessions) &&
    Array.isArray(b.speakers) &&
    Array.isArray(b.rooms) &&
    !!b.event &&
    typeof b.event === "object"
  );
}

const BACKOFF_MS = [15_000, 30_000, 60_000];
/** Matches the API's 60 s CDN TTL: polling faster can't observe a change sooner. */
const POLL_MS = 60_000;
/**
 * IndexedDB can hang without failing (upgrade blocked by another tab, some
 * private modes). The write is best effort: past this the bundle is served
 * from memory for the session and the sync completes instead of wedging.
 */
const PERSIST_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Catalogue store for the active event. Rows live in Dexie (one row per
 * session/speaker/room, one meta row), the read model lives in memory as an
 * immutable snapshot published to React via subscribe/getState
 * (useSyncExternalStore). Sync is gated by the 60-byte version endpoint, so
 * an app open with an unchanged schedule costs one tiny request and no
 * IndexedDB write. A failed sync never touches the snapshot.
 */
export class EventStore {
  private state: StoreState = SERVER_STATE;
  private readonly listeners = new Set<() => void>();
  private inflight: Promise<SyncResult> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private failures = 0;

  constructor(private readonly source: IEventDataProvider) {}

  getState = (): StoreState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private set(patch: Partial<StoreState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of [...this.listeners]) listener();
  }

  /** Read the active event's rows from Dexie and build the first snapshot. */
  async hydrate(dataset: Dataset): Promise<void> {
    const t0 = performance.now();
    const { eventId } = dataset;
    if (!cacheDB) {
      this.set({ snapshot: emptySnapshot(eventId), hydrated: true, hydrateMs: 0 });
      return;
    }
    try {
      const [sessions, speakers, rooms, meta] = await Promise.all([
        cacheDB.eventSessions.where("eventId").equals(eventId).toArray(),
        cacheDB.eventSpeakers.where("eventId").equals(eventId).toArray(),
        cacheDB.eventRooms.where("eventId").equals(eventId).toArray(),
        cacheDB.eventMeta.get(eventId),
      ]);
      const snapshot = materialize(
        { sessions, speakers, rooms, meta: meta ?? null },
        eventId
      );
      this.set({
        snapshot,
        meta: meta ?? null,
        hydrated: true,
        hydrateMs: Math.round(performance.now() - t0),
      });
    } catch (err) {
      console.warn("[event-store] hydrate failed, starting empty:", err);
      this.set({
        snapshot: emptySnapshot(eventId),
        meta: null,
        hydrated: true,
        hydrateMs: Math.round(performance.now() - t0),
      });
    }
  }

  /** Version probe, then bundle only if needed. Concurrent calls share one run. */
  sync(dataset: Dataset, opts: { force?: boolean } = {}): Promise<SyncResult> {
    if (this.inflight) return this.inflight;
    this.inflight = this.run(dataset, opts.force === true).finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async run(dataset: Dataset, force: boolean): Promise<SyncResult> {
    const { eventId } = dataset;
    // Known offline: don't flash "syncing" then fail once a minute (the
    // reconnect trigger runs a sync the moment the network is back). A forced
    // sync still tries, so the debug panel can prove the point.
    if (!force && typeof navigator !== "undefined" && navigator.onLine === false) {
      this.set({ status: "offline" });
      return "failed";
    }
    this.set({ status: "syncing" });
    try {
      const remote = await this.source.getVersion(dataset);
      const meta = this.state.meta?.eventId === eventId ? this.state.meta : null;
      // Gate on the meta row alone, not on "having sessions": an event that is
      // published with zero sessions yet (the app ships before the schedule)
      // is a legitimate synced state, not a reason to re-download the bundle
      // on every poll. Rows and meta are written in one transaction, so they
      // cannot disagree. An empty or absent remote version cannot mean
      // "changed" either: treat it as unchanged when a synced copy exists.
      const remoteKnown = remote !== "" && remote !== "null" && remote !== "undefined";
      const unchanged =
        meta !== null && !force && (!remoteKnown || !shouldFetch(remote, meta.version, false));

      if (meta && unchanged) {
        const checked: EventMetaRow = { ...meta, checkedAt: Date.now() };
        this.failures = 0;
        this.set({ status: "idle", meta: checked, lastError: null });
        return "unchanged";
      }

      const raw = await this.source.getBundle(dataset);
      if (!isBundleShaped(raw)) {
        throw new Error("Bundle response has an unexpected shape");
      }
      const bundle = validateWithToast(
        () => BundleSchema.parse(raw) as EventBundle,
        raw,
        "EventBundle"
      );
      const rows = normalizeBundle(bundle, eventId, Date.now());

      // Publish first, persist second: the UI gets the new schedule the
      // moment it is parsed, and a slow or stuck IndexedDB write (blocked
      // upgrade, quota) can neither delay nor lose it for this session.
      const snapshot = materialize(rows, eventId);
      this.failures = 0;
      this.set({ snapshot, meta: rows.meta, status: "idle", lastError: null });

      if (cacheDB) {
        const db = cacheDB;
        await withTimeout(
          db.transaction(
            "rw",
            [db.eventSessions, db.eventSpeakers, db.eventRooms, db.eventMeta],
            async () => {
              await Promise.all([
                db.eventSessions.where("eventId").equals(eventId).delete(),
                db.eventSpeakers.where("eventId").equals(eventId).delete(),
                db.eventRooms.where("eventId").equals(eventId).delete(),
              ]);
              await Promise.all([
                db.eventSessions.bulkAdd(rows.sessions),
                db.eventSpeakers.bulkAdd(rows.speakers),
                db.eventRooms.bulkAdd(rows.rooms),
                db.eventMeta.put(rows.meta),
              ]);
            }
          ),
          PERSIST_TIMEOUT_MS,
          "IndexedDB write"
        ).catch((err) => {
          // Quota / private mode / blocked upgrade: keep serving from memory
          // for this session.
          console.warn("[event-store] persist failed, keeping data in memory:", err);
        });
      }

      return "updated";
    } catch (err) {
      const offline =
        typeof navigator !== "undefined" && navigator.onLine === false;
      this.set({
        status: offline ? "offline" : "error",
        lastError: err instanceof Error ? err.message : String(err),
      });
      if (!offline) this.scheduleRetry(dataset);
      return "failed";
    }
  }

  private scheduleRetry(dataset: Dataset): void {
    if (this.retryTimer) return;
    const delay = BACKOFF_MS[Math.min(this.failures, BACKOFF_MS.length - 1)];
    this.failures += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.sync(dataset);
    }, delay);
  }

  /**
   * Boot wiring: first sync now, refresh when the tab becomes visible or the
   * network returns, poll every minute while visible. Returns a cleanup.
   */
  startTriggers(dataset: Dataset): () => void {
    if (typeof window === "undefined") return () => undefined;
    const kick = () => {
      void this.sync(dataset);
    };
    const startPolling = () => {
      if (!this.pollTimer) this.pollTimer = setInterval(kick, POLL_MS);
    };
    const stopPolling = () => {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        kick();
        startPolling();
      } else {
        stopPolling();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", kick);
    kick();
    if (document.visibilityState === "visible") startPolling();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", kick);
      stopPolling();
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
    };
  }
}

export const eventStore = new EventStore(provider);
