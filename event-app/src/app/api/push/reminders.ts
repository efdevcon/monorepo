/**
 * Session reminders: push "<title> starts in 15 minutes at 13:00, on Stage 1"
 * to the account's devices. A best-effort accelerant — the Personal tab of the
 * inbox derives the same items on-device from local stars
 * (src/data/reminders/), so a missed push is never a missed reminder.
 *
 * Design (mirrors the announcement dispatcher in service.ts):
 * - Who: devcon8_interests (stars synced while signed in) joined to
 *   devcon8_push_subscriptions by user_id. Only synced stars count: a
 *   signed-out or offline-only device gets no push (its inbox still shows
 *   the reminder).
 * - When: the live schedule decides. Every minute the dispatcher lists the
 *   sessions with start − LEAD ≤ now < start and hands them to the claim
 *   RPC, so a slot that moves BEFORE the reminder goes out is simply
 *   re-evaluated. Rows are keyed on (user, event, session): a slot that
 *   moves AFTER the send is not re-sent (`session_start` on the row is the
 *   audit trail), a star added inside the window is claimed on the next
 *   tick, unstarring after the send does nothing.
 * - Crash-safe: the row is the claim (insert … on conflict do nothing, see
 *   the migration). Rows a crashed run left in `sending` are reclaimed after
 *   STALL_MS while the session is still ahead, retired as `skipped` once it
 *   has begun.
 * - Budget: at most MAX_REMINDERS_PER_RUN pairs per run, one bulk `deliver`
 *   and one bookkeeping pass. Leftovers are claimed next minute — the 15-min
 *   window gives 15 runs to drain a spike of same-minute starts.
 *
 * Server-only (service-role key through service.ts).
 */
import {
  DATASETS,
  DEFAULT_DATASET_KEY,
  type Dataset,
  type DatasetKey,
} from "@/data/dataset";
import {
  dueSessions,
  REMINDER_LEAD_MS,
  reminderBody,
} from "@/data/reminders/reminders";
import { detailHref } from "@/routing/viewParams";
import {
  buildPayload,
  deliver,
  getSubscriptionsForUsers,
  getSupabase,
  recordDeliveries,
  STALL_MS,
  type DeliveryItem,
  type PushSubscriptionRow,
} from "./service";

/** Fresh claims per run per event; the rest wait a minute (time budget). */
export const MAX_REMINDERS_PER_RUN = 150;
const BUNDLE_TIMEOUT_MS = 8_000;
/** Matches the API's publicCache(60) on the bundle. */
const CATALOGUE_TTL_MS = 60_000;

/** What the dispatcher needs to know about a session. Times in ms. */
export interface ReminderSession {
  id: string;
  title: string;
  startMs: number;
  roomName?: string;
}

/**
 * Events to send reminders for: PUSH_REMINDER_EVENTS="devcon8,test-devcon-8"
 * (comma-separated dataset keys), else the deployment's default dataset.
 * Stars are keyed by dataset on the device and in devcon8_interests, so a
 * test-dataset star only ever reaches a push through this list.
 */
export function reminderDatasets(): Dataset[] {
  const raw = process.env.PUSH_REMINDER_EVENTS;
  const keys = raw
    ? raw.split(",").map((k) => k.trim()).filter(Boolean)
    : [DEFAULT_DATASET_KEY];
  const known = keys.filter((k): k is DatasetKey => k in DATASETS);
  return [...new Set(known)].map((k) => DATASETS[k]);
}

/** The bundle serves `slot_start` as a ms number or an ISO string (see normalize.ts). */
const toMs = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v) return new Date(v).getTime() || 0;
  return 0;
};

interface BundleEnvelope {
  data?: {
    rooms?: { id?: string; name?: string }[];
    sessions?: {
      id?: string;
      title?: string;
      slot_start?: number | string;
      slot_roomId?: string;
    }[];
  };
}

const catalogueCache = new Map<
  string,
  { at: number; sessions: ReminderSession[] }
>();

/**
 * The event's sessions with start time and room name, from devcon-api's
 * bundle endpoint (only the fields we need), memoised for a minute so the
 * every-minute dispatcher and a test send don't refetch a 1 MB bundle.
 */
export async function fetchReminderCatalogue(
  ds: Dataset,
  nowMs = Date.now()
): Promise<ReminderSession[]> {
  const cached = catalogueCache.get(ds.eventId);
  if (cached && nowMs - cached.at < CATALOGUE_TTL_MS) return cached.sessions;

  const url = `${ds.apiUrl}/events/${encodeURIComponent(ds.eventId)}/bundle?fields=id,title,slot_start,slot_roomId`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(BUNDLE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`bundle fetch failed: HTTP ${res.status}`);
  const json = (await res.json()) as BundleEnvelope;
  const roomName = new Map<string, string>();
  for (const r of json.data?.rooms ?? []) {
    if (r.id && r.name) roomName.set(r.id, r.name);
  }
  const sessions: ReminderSession[] = [];
  for (const s of json.data?.sessions ?? []) {
    const startMs = toMs(s.slot_start);
    if (!s.id || !startMs) continue;
    sessions.push({
      id: s.id,
      title: s.title || "Your session",
      startMs,
      roomName: s.slot_roomId ? roomName.get(s.slot_roomId) : undefined,
    });
  }
  catalogueCache.set(ds.eventId, { at: nowMs, sessions });
  return sessions;
}

/**
 * Notification title is a short fixed label; the body carries the session
 * title so it isn't shown twice. Tap opens the session page (buildPayload
 * makes the path absolute for Safari's SW-less display).
 */
export function buildReminderPayload(
  session: ReminderSession,
  timeZone: string,
  nowMs = Date.now()
): string {
  return buildPayload({
    title: "Starting soon",
    message: reminderBody(
      session.title,
      session.startMs,
      timeZone,
      session.roomName,
      nowMs
    ),
    url: detailHref("session", session.id),
  });
}

interface ClaimedRow {
  userId: string;
  sessionId: string;
  sessionStart: string;
}

interface ClaimResult {
  fresh: ClaimedRow[];
  stalled: ClaimedRow[];
  skipped: number;
}

export interface ReminderDispatchResult {
  event: string;
  /** Sessions inside the reminder window this minute. */
  due: number;
  /** (user, session) pairs this run took on (fresh + reclaimed). */
  claimed: number;
  /** Stalled claims retired because their session had already started. */
  skipped: number;
  /** Pairs marked sent (after fan-out), with delivery counts. */
  sent: number;
  ok: number;
  fail: number;
}

type ReminderItem = DeliveryItem & { pair: string };

/**
 * A reminder is worthless once the session has started: the push service
 * keeps it only until then (never under a minute, so it is not dropped on
 * the spot for a device that is briefly offline).
 */
export const reminderTtlSeconds = (startMs: number, nowMs: number) =>
  Math.max(60, Math.ceil((startMs - nowMs) / 1000));
const pairKey = (c: ClaimedRow) => `${c.userId}|${c.sessionId}`;

async function dispatchForDataset(
  ds: Dataset,
  nowMs: number
): Promise<ReminderDispatchResult> {
  const db = getSupabase();
  const sessions = await fetchReminderCatalogue(ds, nowMs);
  const due = dueSessions(sessions, nowMs);

  // Always claim, even with nothing due: the RPC also reclaims/retires
  // stalled rows, which must happen on quiet minutes too.
  const { data, error } = await db.rpc("devcon8_session_reminders_claim", {
    p_event: ds.eventId,
    p_sessions: due.map((s) => ({
      session_id: s.id,
      session_start: new Date(s.startMs).toISOString(),
      send_at: new Date(s.startMs - REMINDER_LEAD_MS).toISOString(),
    })),
    p_stall_before: new Date(nowMs - STALL_MS).toISOString(),
    p_limit: MAX_REMINDERS_PER_RUN,
  });
  if (error) throw new Error(`reminder claim failed: ${error.message}`);
  const claim = (data ?? { fresh: [], stalled: [], skipped: 0 }) as ClaimResult;
  const claimed = [...claim.fresh, ...claim.stalled];

  const result: ReminderDispatchResult = {
    event: ds.eventId,
    due: due.length,
    claimed: claimed.length,
    skipped: claim.skipped ?? 0,
    sent: 0,
    ok: 0,
    fail: 0,
  };
  if (claimed.length === 0) return result;

  // Only the claimed accounts' devices, grouped per account.
  const userIds = [...new Set(claimed.map((c) => c.userId))];
  const subsByUser = new Map<string, PushSubscriptionRow[]>();
  for (const sub of await getSubscriptionsForUsers(userIds)) {
    if (!sub.user_id) continue;
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub);
    subsByUser.set(sub.user_id, list);
  }

  // One payload per session (shared across its users), one item per device.
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const payloads = new Map<string, string>();
  const items: ReminderItem[] = [];
  for (const c of claimed) {
    const session = byId.get(c.sessionId);
    // Vanished from the schedule since the claim: nothing to say; the row is
    // still marked sent (0/0) below so it never lingers in `sending`.
    if (!session) continue;
    let payload = payloads.get(session.id);
    if (!payload) {
      payload = buildReminderPayload(session, ds.timezone, nowMs);
      payloads.set(session.id, payload);
    }
    const ttl = reminderTtlSeconds(session.startMs, nowMs);
    for (const sub of subsByUser.get(c.userId) ?? []) {
      items.push({ pair: pairKey(c), sub, payload, ttl });
    }
  }

  const deliveries = await deliver(items);
  await recordDeliveries(deliveries);

  const stats = new Map<
    string,
    { ok: number; fail: number; errors: Record<string, number> }
  >();
  for (const { item, outcome } of deliveries) {
    const s = stats.get(item.pair) ?? { ok: 0, fail: 0, errors: {} };
    if (outcome.ok) s.ok++;
    else {
      s.fail++;
      s.errors[outcome.code] = (s.errors[outcome.code] ?? 0) + 1;
    }
    stats.set(item.pair, s);
  }

  // Mark every claimed pair sent in one statement (an upsert onto the rows
  // the claim created, so all NOT NULL columns are supplied). On error the
  // rows stay `sending` and the stall window reclaims them.
  const now = new Date().toISOString();
  const rows = claimed.map((c) => {
    const s = stats.get(pairKey(c)) ?? { ok: 0, fail: 0, errors: {} };
    const startMs = new Date(c.sessionStart).getTime();
    result.ok += s.ok;
    result.fail += s.fail;
    return {
      user_id: c.userId,
      event: ds.eventId,
      session_id: c.sessionId,
      session_start: c.sessionStart,
      send_at: new Date(startMs - REMINDER_LEAD_MS).toISOString(),
      status: "sent",
      sent_ok: s.ok,
      sent_fail: s.fail,
      error_breakdown: Object.keys(s.errors).length ? s.errors : null,
      updated_at: now,
    };
  });
  const { error: markError } = await db
    .from("devcon8_session_reminders")
    .upsert(rows, { onConflict: "user_id,event,session_id" });
  if (markError) {
    console.error(
      `[push] failed to mark ${rows.length} reminder(s) sent:`,
      markError.message
    );
  } else {
    result.sent = rows.length;
  }
  return result;
}

/**
 * Claim and push every starred session that enters its reminder window, for
 * each configured event. Idempotent and safe to run concurrently (see the
 * claim RPC). One event's failure (e.g. its bundle fetch) doesn't stop the
 * others; the error is rethrown after so the route logs it.
 */
export async function dispatchDueSessionReminders(
  nowMs = Date.now()
): Promise<ReminderDispatchResult[]> {
  const results: ReminderDispatchResult[] = [];
  let firstError: unknown = null;
  for (const ds of reminderDatasets()) {
    try {
      results.push(await dispatchForDataset(ds, nowMs));
    } catch (err) {
      console.error(`[push] reminders for ${ds.eventId} failed:`, err);
      firstError ??= err;
    }
  }
  if (firstError && results.length === 0) throw firstError;
  return results;
}
