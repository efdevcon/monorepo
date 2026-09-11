/**
 * Wire format of `POST /api/interests/sync`, shared by the route and the
 * client runner (pure module). Times are ms since epoch; `since` and `now` are
 * server-side cursors, `updatedAt` is the device's change time (last write
 * wins per item).
 */
export const INTEREST_KINDS = ["session", "speaker"] as const;
export type InterestKind = (typeof INTEREST_KINDS)[number];

export interface InterestChange {
  kind: InterestKind;
  id: string;
  /** False is a tombstone: the star was removed. */
  interested: boolean;
  updatedAt: number;
}

export interface SyncRequest {
  event: string;
  since: number | null;
  changes: InterestChange[];
}

export interface SyncResponse {
  changes: InterestChange[];
  now: number;
}

export const MAX_CHANGES = 500;
const EVENT_SHAPE = /^[a-z0-9-]{1,40}$/;
const ID_SHAPE = /^[A-Za-z0-9_-]{1,120}$/;
/** A device clock ahead of the server would otherwise win every conflict forever. */
const MAX_FUTURE_MS = 60_000;

/** Validate a request body; null when anything is off (the route answers 400). */
export function parseSyncBody(body: unknown, now = Date.now()): SyncRequest | null {
  if (!body || typeof body !== "object") return null;
  const { event, since, changes } = body as Record<string, unknown>;
  if (typeof event !== "string" || !EVENT_SHAPE.test(event)) return null;
  if (since !== null && (typeof since !== "number" || !Number.isFinite(since) || since < 0)) return null;
  if (!Array.isArray(changes) || changes.length > MAX_CHANGES) return null;
  const parsed: InterestChange[] = [];
  for (const raw of changes) {
    if (!raw || typeof raw !== "object") return null;
    const { kind, id, interested, updatedAt } = raw as Record<string, unknown>;
    if (!INTEREST_KINDS.includes(kind as InterestKind)) return null;
    if (typeof id !== "string" || !ID_SHAPE.test(id)) return null;
    if (typeof interested !== "boolean") return null;
    if (typeof updatedAt !== "number" || !Number.isFinite(updatedAt) || updatedAt < 0) return null;
    parsed.push({
      kind: kind as InterestKind,
      id,
      interested,
      updatedAt: Math.min(Math.floor(updatedAt), now + MAX_FUTURE_MS),
    });
  }
  return { event, since: since as number | null, changes: parsed };
}
