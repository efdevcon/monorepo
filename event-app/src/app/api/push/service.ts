/**
 * Web push (Phase 2 of announcements): subscriptions + dispatch.
 *
 * Design (learned from the Devcon SEA post-mortem):
 * - The inbox is the source of truth; push is a best-effort accelerant.
 * - Crash-safe send-state: rows are claimed (`sending`) atomically and marked
 *   `sent` only AFTER the fan-out settles. A dispatcher crash leaves rows in
 *   `sending`, which a later run reclaims after a stall window — never a
 *   silent drop.
 * - Dead endpoints are pruned (404/410 immediately, repeated failures at a
 *   threshold) so failure counts stay honest.
 * - Payloads use Apple's Declarative Web Push JSON shape (`web_push: 8030`):
 *   Safari 18.4+ displays them without executing the service worker (the
 *   documented iOS reliability fix); everywhere else our classic `push`
 *   handler in src/sw.ts parses the same JSON.
 *
 * Server-only: uses SUPABASE_SERVICE_ROLE_KEY and VAPID_PRIVATE_KEY.
 */
import webpush from "web-push";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import APP_CONFIG from "@/CONFIG";
import type { Announcement } from "@/data/announcements/types";

const CHUNK_SIZE = 50;
/** Extra attempts after the first, for transient (429/5xx/network) failures. */
const RETRY_DELAYS_MS = [300, 1200];
/** Delete a subscription after this many consecutive non-410 failures. */
const FAILURE_THRESHOLD = 5;
/** Reclaim rows stuck in `sending` after this long (dispatcher crash). */
const STALL_MS = 10 * 60 * 1000;
const TTL_SECONDS = 3600;

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string | null;
  is_team: boolean;
}

let supabase: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
      );
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

let vapidReady = false;
function ensureVapid(): void {
  if (vapidReady) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error(
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are required"
    );
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:devcon-website@ethereum.org",
    publicKey,
    privateKey
  );
  vapidReady = true;
}

/**
 * Declarative Web Push payload (also parsed by our classic SW handler).
 * `navigate` must be absolute for Safari's SW-less display path.
 */
export function buildPayload(
  a: Pick<Announcement, "title" | "message" | "url">
): string {
  const origin = APP_CONFIG.APP_ORIGIN;
  const navigate = !a.url
    ? `${origin}/announcements`
    : a.url.startsWith("/")
      ? `${origin}${a.url}`
      : a.url;
  return JSON.stringify({
    web_push: 8030,
    notification: {
      title: a.title,
      body: a.message || undefined,
      navigate,
    },
  });
}

type SendOutcome = { ok: true } | { ok: false; gone: boolean; code: string };

async function sendOnce(
  sub: PushSubscriptionRow,
  payload: string
): Promise<SendOutcome> {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      payload,
      { TTL: TTL_SECONDS, urgency: "high" }
    );
    return { ok: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    return {
      ok: false,
      gone: statusCode === 404 || statusCode === 410,
      code: statusCode ? String(statusCode) : "network",
    };
  }
}

const RETRYABLE = new Set(["429", "500", "502", "503", "504", "network"]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sendWithRetry(
  sub: PushSubscriptionRow,
  payload: string
): Promise<SendOutcome> {
  let outcome = await sendOnce(sub, payload);
  for (const delay of RETRY_DELAYS_MS) {
    if (outcome.ok || outcome.gone || !RETRYABLE.has(outcome.code)) break;
    await sleep(delay);
    outcome = await sendOnce(sub, payload);
  }
  return outcome;
}

export interface FanOutResult {
  ok: number;
  fail: number;
  /** Failure counts per status code (incl. "network"), for the stats column. */
  errors: Record<string, number>;
}

/**
 * Deliver one payload to a set of subscriptions, chunked, with retries and
 * dead-endpoint pruning. Mutates subscription bookkeeping as it goes.
 */
export async function fanOut(
  subs: PushSubscriptionRow[],
  payload: string
): Promise<FanOutResult> {
  ensureVapid();
  const db = getSupabase();
  const result: FanOutResult = { ok: 0, fail: 0, errors: {} };
  const goneEndpoints: string[] = [];
  const okEndpoints: string[] = [];
  const failedEndpoints: string[] = [];

  for (let i = 0; i < subs.length; i += CHUNK_SIZE) {
    const chunk = subs.slice(i, i + CHUNK_SIZE);
    const outcomes = await Promise.all(
      chunk.map((sub) => sendWithRetry(sub, payload))
    );
    outcomes.forEach((outcome, j) => {
      const sub = chunk[j];
      if (outcome.ok) {
        result.ok++;
        okEndpoints.push(sub.endpoint);
      } else if (outcome.gone) {
        result.fail++;
        result.errors[outcome.code] = (result.errors[outcome.code] ?? 0) + 1;
        goneEndpoints.push(sub.endpoint);
      } else {
        result.fail++;
        result.errors[outcome.code] = (result.errors[outcome.code] ?? 0) + 1;
        failedEndpoints.push(sub.endpoint);
      }
    });
  }

  // Bookkeeping, all best-effort — stats must never fail a dispatch.
  const now = new Date().toISOString();
  try {
    if (goneEndpoints.length > 0) {
      await db
        .from("devcon8_push_subscriptions")
        .delete()
        .in("endpoint", goneEndpoints);
    }
    if (okEndpoints.length > 0) {
      await db
        .from("devcon8_push_subscriptions")
        .update({ last_success_at: now, consecutive_failures: 0, updated_at: now })
        .in("endpoint", okEndpoints);
    }
    if (failedEndpoints.length > 0) {
      // PostgREST can't do `col = col + 1`; read-then-write is fine for stats.
      const { data } = await db
        .from("devcon8_push_subscriptions")
        .select("endpoint, consecutive_failures")
        .in("endpoint", failedEndpoints);
      const dead = (data ?? [])
        .filter((r) => r.consecutive_failures + 1 >= FAILURE_THRESHOLD)
        .map((r) => r.endpoint);
      const alive = (data ?? [])
        .filter((r) => r.consecutive_failures + 1 < FAILURE_THRESHOLD)
        .map((r) => r.endpoint);
      if (dead.length > 0) {
        await db.from("devcon8_push_subscriptions").delete().in("endpoint", dead);
      }
      for (const endpoint of alive) {
        const row = (data ?? []).find((r) => r.endpoint === endpoint);
        await db
          .from("devcon8_push_subscriptions")
          .update({
            consecutive_failures: (row?.consecutive_failures ?? 0) + 1,
            updated_at: now,
          })
          .eq("endpoint", endpoint);
      }
    }
  } catch (err) {
    console.warn("[push] subscription bookkeeping failed:", err);
  }

  return result;
}

export async function getSubscriptions(options: {
  teamOnly?: boolean;
}): Promise<PushSubscriptionRow[]> {
  let query = getSupabase()
    .from("devcon8_push_subscriptions")
    .select("endpoint, p256dh, auth, user_id, is_team");
  if (options.teamOnly) query = query.eq("is_team", true);
  const { data, error } = await query;
  if (error) throw new Error(`subscription query failed: ${error.message}`);
  return data ?? [];
}

export interface DispatchResult {
  claimed: number;
  sent: { id: string; title: string; ok: number; fail: number }[];
  subscribers: number;
}

/**
 * Claim due announcements and push them out. Idempotent and crash-safe:
 * - claim = single UPDATE ... RETURNING (scheduled rows that are due, plus
 *   `sending` rows stalled past the window, i.e. a crashed earlier run);
 * - `sent` + stats are written only after the fan-out settles.
 */
export async function dispatchDueAnnouncements(): Promise<DispatchResult> {
  const db = getSupabase();
  const nowIso = new Date().toISOString();
  const stalledBefore = new Date(Date.now() - STALL_MS).toISOString();

  // Two atomic claim statements (this PostgREST version rejects .or() on
  // UPDATE): due scheduled rows, then stalled `sending` rows from a crashed
  // run. Each UPDATE serializes on row locks, so concurrent dispatchers can't
  // double-claim; the first statement's updated_at bump keeps its rows out of
  // the second's stall window.
  const { data: fresh, error: freshError } = await db
    .from("devcon8_announcements")
    .update({ status: "sending", updated_at: nowIso })
    .eq("status", "scheduled")
    .eq("push", true)
    .eq("visible", true)
    .lte("send_at", nowIso)
    .select("id, title, message, url");
  if (freshError) throw new Error(`claim failed: ${freshError.message}`);

  const { data: stalled, error: stalledError } = await db
    .from("devcon8_announcements")
    .update({ status: "sending", updated_at: nowIso })
    .eq("status", "sending")
    .eq("push", true)
    .eq("visible", true)
    .lte("send_at", nowIso)
    .lt("updated_at", stalledBefore)
    .select("id, title, message, url");
  if (stalledError) throw new Error(`reclaim failed: ${stalledError.message}`);

  const claimed = [...(fresh ?? []), ...(stalled ?? [])];
  if (claimed.length === 0) {
    return { claimed: 0, sent: [], subscribers: 0 };
  }

  const subs = await getSubscriptions({});
  const sent: DispatchResult["sent"] = [];

  for (const announcement of claimed) {
    const result =
      subs.length > 0
        ? await fanOut(subs, buildPayload(announcement))
        : { ok: 0, fail: 0, errors: {} };
    const { error } = await db
      .from("devcon8_announcements")
      .update({
        status: "sent",
        sent_ok: result.ok,
        sent_fail: result.fail,
        error_breakdown: Object.keys(result.errors).length ? result.errors : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", announcement.id);
    if (error) {
      // Leave the row in `sending`; the stall window will reclaim it.
      console.error(`[push] failed to mark ${announcement.id} sent:`, error.message);
      continue;
    }
    sent.push({
      id: announcement.id,
      title: announcement.title,
      ok: result.ok,
      fail: result.fail,
    });
  }

  return { claimed: claimed.length, sent, subscribers: subs.length };
}
