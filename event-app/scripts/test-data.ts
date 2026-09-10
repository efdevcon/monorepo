// Pure-function tests for the EventStore and routing modules.
// Run: pnpm data:test

import { normalizeBundle, compact } from "../src/data/store/normalize";
import { materialize, emptySnapshot } from "../src/data/store/materialize";
import { shouldFetch, isBundleShaped } from "../src/data/store/event-store";
import type { EventBundle } from "../src/data/store/types";
import {
  detailHref,
  isDetailPath,
  parseDetailPath,
  stripIgnoredParams,
  tabPathOf,
} from "../src/routing/viewParams";
import { isTransientFetchError, retryOnce } from "../src/utils/retryOnce";
import { whenControlled, type ServiceWorkerControl } from "../src/utils/serviceWorkerControl";
import { buyerOrdersToAssign, derivePrimary, ticketChoices, ticketOrdinals, ticketPrompt } from "../src/data/tickets/primary";
import type { Order } from "../src/data/tickets/types";
import { createRateLimiter } from "../src/app/api/tickets/rateLimit";
import { positionCollected, positionMatchesEmail, redactBuyerIdentity } from "../src/app/api/tickets/pretix";
import { readPassBarcode } from "../src/data/tickets/passBarcode";
import { isUnsupportedPhotoFormat } from "../src/data/tickets/qrFromFile";
import { strToU8, zipSync } from "fflate";
import { mergeRemote, settlePending } from "../src/data/interested/merge";
import { parseSyncBody } from "../src/data/interested/syncProtocol";

let failed = 0;
const check = (label: string, ok: boolean, note = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${note ? ` (${note})` : ""}`);
};
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// 2024-11-13 08:30 UTC = 15:30 Asia/Bangkok (devcon-7 venue timezone).
const T0 = Date.UTC(2024, 10, 13, 8, 30);

export const FIXTURE: EventBundle = {
  version: "v-1",
  event: {
    id: "devcon-7",
    title: "Devcon 7",
    startDate: "2024-11-12",
    endDate: "2024-11-15",
    featuredSpeakers: ["alice"],
  },
  rooms: [{ id: "stage-1", name: "Stage 1", capacity: null, youtubeStreamUrl_1: "https://yt/1" }],
  speakers: [
    { id: "alice", name: "Alice", avatar: "https://img/alice.webp", twitter: "alice" },
    { id: "bob", name: "Bob", description: "Builder" },
  ],
  sessions: [
    {
      id: "talk-a",
      title: "Talk A",
      description: "About A",
      track: "Security",
      type: "Talk",
      expertise: "Beginner",
      tags: "zk, rollups ,",
      featured: true,
      slot_start: T0,
      slot_end: T0 + 30 * 60_000,
      slot_roomId: "stage-1",
      speakerIds: ["alice", "ghost"],
      sources_youtubeId: "",
    },
    {
      id: "talk-b",
      title: "Talk B",
      slot_start: new Date(T0 + 60 * 60_000).toISOString(),
      slot_end: new Date(T0 + 90 * 60_000).toISOString(),
      speakerIds: ["bob"],
      tags: ["a", "b"],
    },
  ],
};

function testNormalize() {
  const rows = normalizeBundle(FIXTURE, "devcon-7", 1_000);

  check("one row per session/speaker/room", rows.sessions.length === 2 && rows.speakers.length === 2 && rows.rooms.length === 1);
  check("meta carries version and timestamps", rows.meta.version === "v-1" && rows.meta.syncedAt === 1_000 && rows.meta.checkedAt === 1_000);
  check("meta carries event fields", rows.meta.title === "Devcon 7" && eq(rows.meta.featuredSpeakers, ["alice"]));

  const a = rows.sessions[0];
  check("session keeps ids, drops embeds", eq(a.speakerIds, ["alice", "ghost"]) && a.roomId === "stage-1" && !("speakers" in a) && !("slot_room" in a));
  check("tags parsed from CSV string", eq(a.tags, ["zk", "rollups"]));
  check("tags accepted as array", eq(rows.sessions[1].tags, ["a", "b"]));
  check("numeric slot times kept as ms", a.slotStart === T0 && a.slotEnd === T0 + 30 * 60_000);
  check("ISO slot times converted to ms", rows.sessions[1].slotStart === T0 + 60 * 60_000);
  check("featured true kept, absent omitted", a.featured === true && !("featured" in rows.sessions[1]));
  check("empty source id omitted", !("sources_youtubeId" in a));
  check("no undefined keys on rows", rows.sessions.every((r) => Object.values(r).every((v) => v !== undefined)));
  check("missing text fields default to empty strings", rows.sessions[1].description === "" && rows.sessions[1].track === "" && rows.sessions[1].type === "Talk");
  check("room null capacity omitted", !("capacity" in rows.rooms[0]));
  check("compact strips undefined", eq(compact({ a: 1, b: undefined }), { a: 1 }));
}

function testMaterialize() {
  const rows = normalizeBundle(FIXTURE, "devcon-7", 1_000);
  const snap = materialize(rows, "devcon-7");

  check("sessions sorted by start", snap.sessions.map((s) => s.id).join(",") === "talk-a,talk-b");
  const a = snap.sessionById.get("talk-a")!;
  check("start/end in seconds, duration derived", a.start === Math.floor(T0 / 1000) && a.duration === 30 * 60);
  check("room joined by id", a.room?.name === "Stage 1" && a.room?.youtubeStreamUrl_1 === "https://yt/1");
  check("speakers joined by id, shared references", a.speakers[0] === snap.speakerById.get("alice"));
  check("unknown speaker id becomes a placeholder", a.speakers[1].id === "ghost" && a.speakers[1].name === "ghost");
  check("unknown room id leaves room undefined", snap.sessionById.get("talk-b")!.room === undefined);
  // Day fields follow the active dataset's venue timezone (devcon-7 default → Asia/Bangkok).
  check("date/dayOfWeek in venue timezone", a.date === "2024-11-13" && a.dayOfWeek === "Wednesday" && a.day === "3");
  check("speakers stamped with event provenance", snap.speakerById.get("alice")!.eventId === "devcon-7" && snap.speakerById.get("alice")!.eventLabel === "Devcon 7");
  check("speaker required strings default", snap.speakerById.get("bob")!.avatar === "" && snap.speakerById.get("alice")!.description === "");
  check("room required strings default", snap.roomById.get("stage-1")!.description === "" && snap.roomById.get("stage-1")!.info === "");
  check("event built from meta", snap.event?.id === "devcon-7" && eq(snap.event?.featuredSpeakers, ["alice"]));
  check("lists match maps", snap.speakers.length === 2 && snap.rooms.length === 1);

  const empty = emptySnapshot("x");
  check("empty snapshot", empty.sessions.length === 0 && empty.event === undefined && empty.sessionById.size === 0);
  const noMeta = materialize({ ...rows, meta: null }, "devcon-7");
  check("no meta → no event", noMeta.event === undefined && noMeta.sessions.length === 2);
}

function testSyncDecision() {
  check("first sync fetches", shouldFetch("v2", null, false) === true);
  check("unchanged version skips", shouldFetch("v2", "v2", false) === false);
  check("changed version fetches", shouldFetch("v3", "v2", false) === true);
  check("force always fetches", shouldFetch("v2", "v2", true) === true);
  check("bundle shape: fixture ok", isBundleShaped(FIXTURE) === true);
  check("bundle shape: missing arrays rejected", isBundleShaped({ version: "1", event: {} }) === false);
  check("bundle shape: non-string version rejected", isBundleShaped({ ...FIXTURE, version: 1 }) === false);
  check("bundle shape: null rejected", isBundleShaped(null) === false);
}

function testRouting() {
  const origin = "https://app.example";
  check("detailHref session", detailHref("session", "a b") === "/schedule/a%20b");
  check("detailHref speaker", detailHref("speaker", "bob") === "/speakers/bob");

  // Shell cache keys: the query never changes a shell, only Next's RSC marker
  // tells a payload request from the document.
  const stripped = stripIgnoredParams(new URL(`${origin}/speakers?dataset=devcon-7&mockNow=1&_rsc=abc&utm_source=t&igshid=z`));
  check("stripIgnoredParams keeps only the RSC marker", stripped.search === "?_rsc=abc", stripped.search);
  const input = new URL(`${origin}/a?dataset=1`);
  stripIgnoredParams(input);
  check("stripIgnoredParams does not mutate input", input.search === "?dataset=1");

  check("parseDetailPath session", eq(parseDetailPath("/schedule/my-talk"), { kind: "session", id: "my-talk" }));
  check("parseDetailPath speaker, trailing slash", eq(parseDetailPath("/speakers/alice/"), { kind: "speaker", id: "alice" }));
  check("parseDetailPath decodes the id", parseDetailPath("/schedule/a%20b")?.id === "a b");
  check("static files under /schedule are not details", parseDetailPath("/schedule/devcon8-logo.svg") === null);
  check("nested static paths are not details", parseDetailPath("/schedule/gems/security.webp") === null);
  check("shell routes are not details", parseDetailPath("/schedule") === null && parseDetailPath("/speakers/") === null);
  check("other routes are not details", parseDetailPath("/room-screens/stage-1") === null);
  check("isDetailPath", isDetailPath("/speakers/bob") && !isDetailPath("/speakers"));

  check("tabPathOf tab routes", tabPathOf("/schedule") === "/schedule" && tabPathOf("/") === "/");
  check("tabPathOf detail pages map to their list tab", tabPathOf("/schedule/my-talk") === "/schedule" && tabPathOf("/speakers/bob") === "/speakers");
  check("tabPathOf other routes", tabPathOf("/announcements") === null && tabPathOf("/room-screens/x") === null);
}

async function testRetryOnce() {
  const noSleep = async () => {};
  let calls = 0;
  const flaky = async () => {
    calls++;
    if (calls === 1) throw new TypeError("Load failed");
    return "ok";
  };
  check("retryOnce: network failure retried once", (await retryOnce(flaky, isTransientFetchError, 0, noSleep)) === "ok" && calls === 2);

  calls = 0;
  const appError = async () => {
    calls++;
    throw new Error("Invalid or expired session");
  };
  const err = await retryOnce(appError, isTransientFetchError, 0, noSleep).catch((e: Error) => e);
  check("retryOnce: application error not retried", err instanceof Error && err.message === "Invalid or expired session" && calls === 1);

  calls = 0;
  const dead = async () => {
    calls++;
    throw new SyntaxError("Unexpected token <");
  };
  const err2 = await retryOnce(dead, isTransientFetchError, 0, noSleep).catch((e: Error) => e);
  check("retryOnce: second failure propagates after one retry", err2 instanceof SyntaxError && calls === 2);
  check("isTransientFetchError classifies", isTransientFetchError(new TypeError("x")) && isTransientFetchError(new SyntaxError("x")) && !isTransientFetchError(new Error("x")));
}

/** Fake navigator.serviceWorker: a controller slot plus a `claim()` that fires controllerchange. */
function fakeContainer(controller: object | null) {
  const listeners: Array<() => void> = [];
  const fake = {
    controller,
    addEventListener: (_type: string, cb: () => void) => {
      listeners.push(cb);
    },
    claim() {
      fake.controller = {};
      for (const cb of listeners.splice(0)) cb();
    },
  };
  return fake;
}
const asControl = (fake: ReturnType<typeof fakeContainer>) => fake as unknown as ServiceWorkerControl;

async function testWhenControlled() {
  check("whenControlled: no container resolves false", (await whenControlled(undefined)) === false);
  check("whenControlled: already controlled resolves true", (await whenControlled(asControl(fakeContainer({})))) === true);

  // Cold visit: nothing controls the page yet; the worker claims it later.
  const cold = fakeContainer(null);
  let settled: boolean | null = null;
  void whenControlled(asControl(cold)).then((v) => {
    settled = v;
  });
  await Promise.resolve();
  check("whenControlled: waits while no worker controls the page", settled === null);
  cold.claim();
  await Promise.resolve();
  check("whenControlled: resolves true once the worker claims the page", settled === true);
}

function ticket(secret: string, extra: Partial<Order["tickets"][number]> = {}): Order["tickets"][number] {
  return { secret, attendeeName: null, attendeeEmail: "a@b.c", price: "0", itemName: "T", addons: [], ...extra };
}
const order = (code: string, tickets: Order["tickets"]): Order => ({ orderCode: code, orderDate: "", email: "a@b.c", tickets });

function testPrimary() {
  const one = [order("A", [ticket("s1")])];
  check("primary: the only email-matched ticket", derivePrimary(one)?.secret === "s1");
  check("prompt: none needed with one ticket", ticketPrompt(one) === null);

  const two = [order("A", [ticket("s1"), ticket("s2")])];
  check("primary: none with two email-matched tickets", derivePrimary(two) === null);
  check("prompt: choose with two tickets", ticketPrompt(two) === "choose");

  const attached = [order("B", [ticket("s9", { attached: true })]), ...two];
  check("primary: attached ticket wins", derivePrimary(attached)?.secret === "s9");
  check("prompt: none once attached", ticketPrompt(attached) === null);

  const swagOnly = [order("A", [ticket("m1", { admission: false })])];
  check("primary: swag is never primary", derivePrimary(swagOnly) === null);
  check("prompt: none-found when only swag", ticketPrompt(swagOnly) === "none");
  check("prompt: none-found with no orders", ticketPrompt([]) === "none");

  const buyerOrder = order("A", [
    ticket("s1", { positionId: 11, positionNumber: 1, attendeeName: "Ada", addons: [{ id: 1, secret: "x", itemName: "Shirt - L", price: "0", attendeeName: null }] }),
    ticket("s2", { positionId: 12, positionNumber: 2, sharedWith: 1 }),
    ticket("m1", { admission: false, positionId: 13 }),
  ]);
  buyerOrder.url = "https://tickets.example/order/A/secret/";
  const choices = ticketChoices([buyerOrder, order("B", [ticket("fixture")])]);
  check("choices: numbered 1..n within the order", choices[0].ordinal === 1 && choices[1].ordinal === 2 && choices[2].ordinal === 1);
  const gapped = order("G", [ticket("g1", { positionId: 1, positionNumber: 1 }), ticket("g3", { positionId: 3, positionNumber: 3 })]);
  check("ordinals: Pretix gaps close (positions 1 and 3 read as #1 and #2)", eq([...ticketOrdinals([gapped]).values()], [1, 2]));
  const toAssign = buyerOrdersToAssign([buyerOrder, order("B", [ticket("fixture")])]);
  check("buyer orders: several tickets under the buyer's email, with the order page", toAssign.length === 1 && toAssign[0].orderCode === "A" && toAssign[0].tickets.length === 2 && toAssign[0].url === buyerOrder.url);
  const withFixture = order("F", [ticket("real", { positionId: 1, positionNumber: 1 }), ticket("fake-fixture")]);
  withFixture.url = "https://tickets.example/order/F/secret/";
  check("buyer orders: fixture tickets without a position do not count", buyerOrdersToAssign([withFixture]).length === 0);
  check("buyer orders: tickets listed with their numbers", eq(toAssign[0].tickets.map((t) => t.ordinal), [1, 2]));
  const single = order("C", [ticket("c1"), ticket("c2")]);
  check("buyer orders: no order page means not the buyer, no hint", buyerOrdersToAssign([single]).length === 0);
  // After a choice the chosen ticket and the rest arrive as two objects for one order.
  const chosen = order("A", [ticket("s1", { positionId: 11, positionNumber: 1, attached: true })]);
  chosen.url = buyerOrder.url;
  const rest = order("A", [ticket("s2", { positionId: 12, positionNumber: 2 })]);
  rest.url = buyerOrder.url;
  const afterChoice = buyerOrdersToAssign([chosen, rest]);
  check("buyer orders: after a choice both tickets stay listed, same as before", afterChoice.length === 1 && eq(afterChoice[0].tickets.map((t) => [t.secret, t.ordinal]), [["s1", 1], ["s2", 2]]));
  const d = order("D", [ticket("d1", { positionId: 21, positionNumber: 1 })]);
  d.url = "https://tickets.example/order/D/secret/";
  const e = order("E", [ticket("e1", { positionId: 31, positionNumber: 1 })]);
  e.url = "https://tickets.example/order/E/secret/";
  const attendeeOnly = order("Y", [ticket("y1", { positionId: 41, positionNumber: 1 })]);
  check("buyer orders: several single-ticket orders count together; a ticket bought by someone else does not", eq(buyerOrdersToAssign([d, e, attendeeOnly]).map((o) => o.orderCode), ["D", "E"]));
  check("buyer orders: one ticket in total, no hint", buyerOrdersToAssign([d]).length === 0);

  // Rows and chips share one order: orders as placed, tickets by position,
  // whatever the payload order (a chosen ticket's order moves to the front).
  const older = order("OLD", [ticket("o2", { positionId: 2, positionNumber: 2 }), ticket("o1", { positionId: 1, positionNumber: 1 })]);
  older.orderDate = "2026-01-01T00:00:00Z"; older.url = "https://tickets.example/order/OLD/s/";
  const newer = order("NEW", [ticket("n1", { positionId: 3, positionNumber: 1 })]);
  newer.orderDate = "2026-02-01T00:00:00Z"; newer.url = "https://tickets.example/order/NEW/s/";
  const rows = ticketChoices([older, newer]).map((c) => c.secret);
  const chips = buyerOrdersToAssign([older, newer]).flatMap((o) => o.tickets.map((t) => t.secret));
  check("display order: rows are chronological by order, tickets by position", eq(rows, ["o1", "o2", "n1"]));
  check("display order: chips follow the rows", eq(chips, rows));
  check("display order: unchanged when the payload is reordered", eq(ticketChoices([newer, older]).map((c) => c.secret), rows));
  check("choices: other holders flagged", choices[1].sharedWith === 1 && choices[0].sharedWith === undefined);
  check("choices: admission tickets only, in order", eq(choices.map((c) => c.secret), ["s1", "s2", "fixture"]));
  check("choices: holder, add-ons and order carried", choices[0].holder === "Ada" && eq(choices[0].addons, ["Shirt - L"]) && choices[0].orderCode === "A");
  check("choices: email fallback for the holder", choices[1].holder === "a@b.c");
  check("choices: id-less ticket cannot be chosen", choices[2].positionId === undefined);
  const fixtureOrder = order("TEST-A", [ticket("fx", { positionId: -1, positionNumber: 1, test: true })]);
  check("choices: fixture ticket is choosable and marked test", ticketChoices([fixtureOrder])[0].positionId === -1 && ticketChoices([fixtureOrder])[0].test === true);
  check("primary: a chosen fixture ticket leads like a real one", derivePrimary([order("TEST-A", [ticket("fx", { positionId: -1, attached: true, test: true })]), buyerOrder])?.secret === "fx");

  check("email match: attendee email wins, case-insensitive", positionMatchesEmail({ attendee_email: "Ada@Example.com" }, "buyer@example.com", "ada@example.com"));
  check("email match: falls back to the order email", positionMatchesEmail({ attendee_email: null }, "buyer@example.com", "buyer@example.com"));
  check("email match: reassigned ticket no longer matches the buyer", !positionMatchesEmail({ attendee_email: "colleague@example.com" }, "buyer@example.com", "buyer@example.com"));

  const bought = order("Z", [
    ticket("q1", { attendeeEmail: "buyer@example.com", attendeeName: "Buyer Name", addons: [{ id: 1, secret: "x", itemName: "Shirt", price: "0", attendeeName: "Buyer Name" }] }),
  ]);
  bought.email = "buyer@example.com";
  bought.url = "https://tickets.example/order/Z/secret/";
  const redacted = redactBuyerIdentity(bought, "holder@example.com");
  check("redact: buyer email and names removed from a QR-attached ticket", redacted.email === "holder@example.com" && redacted.tickets[0].attendeeEmail === "holder@example.com" && redacted.tickets[0].attendeeName === null && redacted.tickets[0].addons[0].attendeeName === null);
  check("redact: order page url withheld from a QR holder", redacted.url === undefined);
  check("redact: original order untouched", bought.tickets[0].attendeeName === "Buyer Name");
  const own = redactBuyerIdentity(bought, "Buyer@Example.com");
  check("redact: the holder's own ticket keeps its name", own.tickets[0].attendeeName === "Buyer Name" && own.email === "buyer@example.com");

  check("collected: an entry scan counts", positionCollected({ checkins: [{ list: 1, type: "entry" }] }));
  check("collected: a scan with no type is an entry", positionCollected({ checkins: [{ list: 1 }] }));
  check("collected: an exit scan does not count", !positionCollected({ checkins: [{ list: 1, type: "exit" }] }));
  check("collected: no scans", !positionCollected({ checkins: [] }) && !positionCollected({}));
}

function testRateLimiter() {
  let t = 0;
  const limiter = createRateLimiter(3, 1000, () => t);
  check("rate limit: first three allowed", limiter.allow("u") && limiter.allow("u") && limiter.allow("u"));
  check("rate limit: fourth blocked", !limiter.allow("u"));
  check("rate limit: other key unaffected", limiter.allow("v"));
  t = 1001;
  check("rate limit: window slides", limiter.allow("u"));
}

function testInterestsMerge() {
  const local = { interested: true, updatedAt: 1000, pending: 0 };
  check("interests: newer remote tombstone wins", eq(mergeRemote(local, { interested: false, updatedAt: 2000 }), { interested: false, updatedAt: 2000, pending: 0 }));
  check("interests: tie keeps local", mergeRemote(local, { interested: false, updatedAt: 1000 }) === null);
  check("interests: older remote ignored", mergeRemote(local, { interested: false, updatedAt: 500 }) === null);
  check("interests: unknown item adopted from the account", eq(mergeRemote(undefined, { interested: true, updatedAt: 7 }), { interested: true, updatedAt: 7, pending: 0 }));
  const pending = { interested: true, updatedAt: 3000, pending: 1 };
  check("interests: pushed row settles when unchanged", eq(settlePending(pending, 3000), { interested: true, updatedAt: 3000, pending: 0 }));
  check("interests: row changed in flight stays pending", settlePending({ ...pending, updatedAt: 3500 }, 3000) === null);

  const now = 10_000_000;
  const ok = parseSyncBody({ event: "devcon8", since: null, changes: [{ kind: "session", id: "abc-1", interested: true, updatedAt: 1234.7 }] }, now);
  check("sync body: valid request parses (updatedAt floored)", ok?.event === "devcon8" && ok.since === null && ok.changes[0].updatedAt === 1234);
  const ahead = parseSyncBody({ event: "devcon8", since: 5, changes: [{ kind: "speaker", id: "x", interested: false, updatedAt: now + 3_600_000 }] }, now);
  check("sync body: future timestamps clamped", ahead?.changes[0].updatedAt === now + 60_000);
  check("sync body: bad kind rejected", parseSyncBody({ event: "devcon8", since: null, changes: [{ kind: "room", id: "x", interested: true, updatedAt: 1 }] }) === null);
  check("sync body: bad event rejected", parseSyncBody({ event: "Devcon 8", since: null, changes: [] }) === null);
  check("sync body: negative since rejected", parseSyncBody({ event: "devcon8", since: -1, changes: [] }) === null);
  check("sync body: too many changes rejected", parseSyncBody({ event: "devcon8", since: null, changes: Array.from({ length: 501 }, (_, i) => ({ kind: "session", id: `s${i}`, interested: true, updatedAt: 1 })) }) === null);
}

function testPassBarcode() {
  const pass = (json: unknown) => zipSync({ "pass.json": strToU8(JSON.stringify(json)), "icon.png": new Uint8Array([0]) });
  check("pkpass: QR barcode message read", readPassBarcode(pass({ barcodes: [{ format: "PKBarcodeFormatQR", message: "abc123secret", messageEncoding: "iso-8859-1" }] })) === "abc123secret");
  check("pkpass: QR preferred over other formats", readPassBarcode(pass({ barcodes: [{ format: "PKBarcodeFormatPDF417", message: "other" }, { format: "PKBarcodeFormatQR", message: "qr" }] })) === "qr");
  check("pkpass: legacy single barcode read", readPassBarcode(pass({ barcode: { format: "PKBarcodeFormatQR", message: "legacy" } })) === "legacy");
  check("pkpass: no barcode is null", readPassBarcode(pass({ description: "no codes" })) === null);
  check("pkpass: zip without pass.json is null", readPassBarcode(zipSync({ "readme.txt": strToU8("x") })) === null);
  check("pkpass: not a zip is null", readPassBarcode(new Uint8Array([1, 2, 3, 4])) === null);

  const blob = (name: string, type: string) => Object.assign(new Blob([new Uint8Array(4)], { type }), { name });
  check("photo format: HEIC by type or extension is flagged", isUnsupportedPhotoFormat(blob("IMG_1.heic", "")) && isUnsupportedPhotoFormat(blob("x", "image/heic")) && isUnsupportedPhotoFormat(blob("scan.tiff", "image/tiff")));
  check("photo format: PNG, JPEG and PDF are not", !isUnsupportedPhotoFormat(blob("shot.png", "image/png")) && !isUnsupportedPhotoFormat(blob("p.jpg", "image/jpeg")) && !isUnsupportedPhotoFormat(blob("t.pdf", "application/pdf")));
}

async function main() {
  testNormalize();
  testPassBarcode();
  testMaterialize();
  testSyncDecision();
  testRouting();
  testPrimary();
  testRateLimiter();
  testInterestsMerge();
  await testRetryOnce();
  await testWhenControlled();
  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
}

main();
