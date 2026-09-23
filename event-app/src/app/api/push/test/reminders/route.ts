import { NextRequest, NextResponse } from "next/server";
import { requireEthereumOrg } from "@/data/admin/adminApiAuth";
import { dueSessions } from "@/data/reminders/reminders";
import {
  deliver,
  getSubscriptionsForUsers,
  getSupabase,
  recordDeliveries,
  tally,
} from "../../service";
import {
  buildReminderPayload,
  fetchReminderCatalogue,
  reminderDatasets,
  reminderTtlSeconds,
  type ReminderSession,
} from "../../reminders";

/**
 * Team-only rehearsal of the session reminders for the CALLER: what the
 * dispatcher would push to this account at a given clock, sent to this
 * account's devices only. Same catalogue, due window, star lookup, payload
 * and TTL as the real run (reminders.ts), minus the claim: no rows are
 * written and nobody else's devices are touched, so it can be repeated
 * freely, before the event and against test datasets, without affecting the
 * live pipeline. Repeat it with `now` advancing a minute at a time to walk a
 * window the way the every-minute dispatcher would.
 *
 *   POST /api/push/test/reminders
 *     { "now": "2024-11-13T08:15:00Z", "event": "devcon-7", "dryRun": true }
 *
 * `now` (ISO) defaults to the real clock, `event` (dataset key) to the first
 * configured reminder event, `dryRun` lists what is due and starred without
 * sending. Like the real run it only reaches devices with session reminders
 * on; with none, the response says so (`note`) and nothing is sent.
 * `exclude` (session ids) stands in for the claim: a session stays
 * due for 10 minutes, so a caller walking the clock passes the ids already
 * sent in this run or gets them again every minute. Stars must have synced:
 * star while signed in on a device on that dataset.
 */
export async function POST(request: NextRequest) {
  const auth = await requireEthereumOrg(request);
  if (!auth.ok) return auth.response;

  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as {
      now?: unknown;
      event?: unknown;
      dryRun?: unknown;
      exclude?: unknown;
    };
    const exclude = new Set(
      Array.isArray(body.exclude)
        ? body.exclude.filter((id): id is string => typeof id === "string")
        : []
    );
    const nowMs = typeof body.now === "string" ? Date.parse(body.now) : Date.now();
    if (!Number.isFinite(nowMs)) {
      return NextResponse.json(
        { success: false, error: "now must be an ISO date" },
        { status: 400 }
      );
    }
    const datasets = reminderDatasets();
    const ds =
      typeof body.event === "string"
        ? datasets.find((d) => d.key === body.event)
        : datasets[0];
    if (!ds) {
      return NextResponse.json(
        { success: false, error: "Unknown event (dataset key; see PUSH_REMINDER_EVENTS)" },
        { status: 400 }
      );
    }

    const sessions = await fetchReminderCatalogue(ds, nowMs);
    const due = dueSessions(sessions, nowMs);
    let mine: ReminderSession[] = [];
    if (due.length > 0) {
      const { data, error } = await getSupabase()
        .from("devcon8_interests")
        .select("item_id")
        .eq("user_id", auth.userId)
        .eq("event", ds.eventId)
        .eq("kind", "session")
        .eq("interested", true)
        .in("item_id", due.map((s) => s.id));
      if (error) throw new Error(error.message);
      const starred = new Set((data ?? []).map((r) => r.item_id as string));
      mine = due.filter((s) => starred.has(s.id) && !exclude.has(s.id));
    }
    // Only devices with session reminders on, as in production.
    const subs = await getSubscriptionsForUsers([auth.userId]);
    // Tell "reminders off everywhere" apart from "no device at all".
    let anyDevice = subs.length > 0;
    if (!anyDevice) {
      const { count, error } = await getSupabase()
        .from("devcon8_push_subscriptions")
        .select("endpoint", { count: "exact", head: true })
        .eq("user_id", auth.userId);
      if (error) throw new Error(error.message);
      anyDevice = (count ?? 0) > 0;
    }
    const noDevicesNote = anyDevice
      ? "Session reminders are off on all your devices"
      : "this account has no push subscription";

    const describe = (s: ReminderSession) => ({
      id: s.id,
      title: s.title,
      start: new Date(s.startMs).toISOString(),
      room: s.roomName ?? null,
    });
    const base = {
      now: new Date(nowMs).toISOString(),
      event: ds.key,
      due: due.map(describe),
      mine: mine.map(describe),
      devices: subs.length,
      remindersOff: subs.length === 0,
    };

    if (body.dryRun === true || mine.length === 0 || subs.length === 0) {
      // No reminder device outranks the star notes: it is why nothing would
      // arrive even once something starred is due.
      const note =
        body.dryRun === true
          ? subs.length === 0
            ? `dry run, nothing sent; ${noDevicesNote}`
            : "dry run, nothing sent"
          : subs.length === 0
            ? noDevicesNote
            : exclude.size > 0
              ? "nothing new: the due sessions were already sent in this run"
              : "none of the due sessions is starred by this account (synced stars only)";
      return NextResponse.json({ success: true, data: { ...base, sent: 0, ok: 0, fail: 0, note } });
    }

    // Exactly what dispatchForDataset builds per claimed pair.
    const items = mine.flatMap((session) => {
      const payload = buildReminderPayload(session, ds.timezone, nowMs);
      const ttl = reminderTtlSeconds(session.startMs, nowMs);
      return subs.map((sub) => ({ sub, payload, ttl }));
    });
    const deliveries = await deliver(items);
    await recordDeliveries(deliveries);
    return NextResponse.json({
      success: true,
      data: { ...base, sent: mine.length, ...tally(deliveries) },
    });
  } catch (err) {
    console.error("[/api/push/test/reminders] error:", err);
    return NextResponse.json(
      { success: false, error: "Reminder rehearsal failed" },
      { status: 500 }
    );
  }
}
