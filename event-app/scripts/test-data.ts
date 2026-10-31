// Pure-function tests for the EventStore and routing modules.
// Run: pnpm data:test

import { fileProblem, safeFileName, validateFeedbackPayload } from "../src/data/feedback/validate";
import { summarizeUserAgent } from "../src/data/feedback/device";
import { chunkText, feedbackChildren, feedbackProperties, feedbackTitle } from "../src/data/feedback/notion";
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
import { cacheDB, openCacheDB } from "../src/data/cache/cache-db";
import { installMarker, parseInstallVersion } from "../src/data/install/installVersion";
import { isTeamEmail, previewableGates } from "../src/data/release/previewAccess";
import {
  MARKER_TTL_MS,
  MAX_FALLBACK_RELOADS,
  TAKEOVER_TIMEOUT_MS,
  createUpdateFlow,
  type UpdateMarker,
  type UpdateState,
  type WaitingWorker,
} from "../src/utils/serviceWorkerUpdate";
import { whenControlled, type ServiceWorkerControl } from "../src/utils/serviceWorkerControl";
import { buyerOrdersToAssign, derivePrimary, hasAdmissionTicket, ticketChoices, ticketOrdinals, ticketPrompt } from "../src/data/tickets/primary";
import type { Order } from "../src/data/tickets/types";
import { createRateLimiter } from "../src/app/api/tickets/rateLimit";
import { positionCollected, positionMatchesEmail, pretixLookupOutcome, redactBuyerIdentity } from "../src/app/api/tickets/pretix";
import {
  applyLink,
  assistantUrl,
  assistantLink,
  ASSISTANT_URL_BUDGET,
  buildAssistantPrompt,
  parseCodeList,
  parsePlanParams,
  planOverlaps,
  resolvePlan,
} from "../src/data/ai/plan";
import { catalogueDataset, mirrorCatalogueUrl, requestOrigin, rewriteCatalogueLinks, upstreamCatalogueUrl } from "../src/data/ai/catalogueMirror";
import type { Session } from "../src/data/models/sessions";
import { readPassBarcode } from "../src/data/tickets/passBarcode";
import { isSessionId, meerkatQaUrl, meerkatSessionUrl, meerkatStageUrl } from "../src/app/api/meerkat/handover";
import { roomIconUrl } from "../src/components/room-screen/roomIcon";
import { roomScreenRoomIds } from "../src/data/venueRooms";
import { communityOf, communityOptions, isCommunityLed, programmeOf, programmeSessions } from "../src/data/programme";
import { eventDayKey } from "../src/data/eventTime";
import { COMMUNITY_LED_GROUPS, clsTrackName, communityLedGroup } from "../src/data/communityLed";
import { COMMUNITY_HUBS } from "../src/data/communityHubs";
import { DC8_TRACKS, getTrackTheme, trackBadgeLabel, trackFullLabel } from "../src/components/schedule/trackTheme";
import { isPretalxCode, sessionLinkFor } from "../src/data/legacySessionLink";
import { parseIosMajorVersion } from "../src/utils/platform";
import { meerkatEventId } from "../src/data/meerkat";
import { communityHubTopics, findCommunityHub } from "../src/data/communityHubs";
import { deriveTopicOptions } from "../src/data/topics";
import { compareRoomNames, sortRooms } from "../src/components/schedule/utils";
import { COMMUNITY_HUB_DATASETS, DATASETS, communityHubsDataset } from "../src/data/dataset";
import { BundleSchema } from "../src/data/store/types";
import { readFileSync } from "fs";
import { isUnsupportedPhotoFormat } from "../src/data/tickets/qrFromFile";
import { strToU8, zipSync } from "fflate";
import { mergeRemote, settlePending } from "../src/data/interested/merge";
import { parseSyncBody } from "../src/data/interested/syncProtocol";
import {
  deriveReminders,
  dueSessions,
  mergeReminderCatalogues,
  parseReminderCatalogue,
  REMINDER_LEAD_MS,
  reminderBody,
  reminderId,
} from "../src/data/reminders/reminders";
import { RETURN_PARAM, safeReturnPath, signInHref } from "../src/routing/returnTo";
import { syncSessionCookie, whenSessionCookieSettled } from "../src/data/auth/sessionCookie";
import { authCookieName, jwtExpiresAt, parseAuthCookie } from "../src/data/auth/authCookie";
import { HEAL_EXPIRY_MARGIN_S, healScriptBody } from "../src/app/api/meerkat/go/heal";
import { createSupabaseFetch, isTokenRateLimit } from "../src/data/auth/supabaseFetch";
import { sessionCardHash, sessionCardUrl } from "../src/data/sessionCard";
import vm from "node:vm";
import type { Session as AuthSession } from "@supabase/supabase-js";
import { nextTestStatus, notionTestFlags, parseEmailList, productTeamEmails, testPushTitle } from "../src/app/api/announcements/testPush";

let failed = 0;
const check = (label: string, ok: boolean, note = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${note ? ` (${note})` : ""}`);
};
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** A bare session for the programme and theme tests: a track, optionally a room. */
const mkSession = (id: string, track: string, roomId?: string): Session => ({
  id,
  speakers: [],
  title: id,
  track,
  duration: 30,
  start: 0,
  end: 1800,
  room: roomId ? { id: roomId, name: roomId, description: "", info: "" } : undefined,
});

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
    scheduleVersion: "0.21",
  },
  rooms: [{ id: "stage-1", name: "Stage 1", capacity: null, youtubeStreamUrl_1: "https://yt/1" }],
  speakers: [
    { id: "alice", name: "Alice", avatar: "https://img/alice.webp", twitter: "alice" },
    { id: "bob", name: "Bob", description: "Builder" },
  ],
  sessions: [
    {
      id: "talk-a",
      sourceId: "ABC123",
      title: "Talk A",
      description: "About A",
      abstract: "A in short",
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
  check("meta carries event fields", rows.meta.title === "Devcon 7" && eq(rows.meta.featuredSpeakers, ["alice"]) && rows.meta.scheduleVersion === "0.21");

  const a = rows.sessions[0];
  check("session keeps ids, drops embeds", eq(a.speakerIds, ["alice", "ghost"]) && a.roomId === "stage-1" && !("speakers" in a) && !("slot_room" in a));
  check("tags parsed from CSV string", eq(a.tags, ["zk", "rollups"]));
  check("tags accepted as array", eq(rows.sessions[1].tags, ["a", "b"]));
  check("numeric slot times kept as ms", a.slotStart === T0 && a.slotEnd === T0 + 30 * 60_000);
  check("ISO slot times converted to ms", rows.sessions[1].slotStart === T0 + 60 * 60_000);
  check("featured true kept, absent omitted", a.featured === true && !("featured" in rows.sessions[1]));
  check("empty source id omitted", !("sources_youtubeId" in a));
  check("Pretalx code kept as sourceId, omitted when absent", a.sourceId === "ABC123" && !("sourceId" in rows.sessions[1]));
  check("no undefined keys on rows", rows.sessions.every((r) => Object.values(r).every((v) => v !== undefined)));
  check("missing text fields default to empty strings", rows.sessions[1].description === "" && rows.sessions[1].track === "" && rows.sessions[1].type === "Talk");
  check("abstract kept, omitted when absent", a.abstract === "A in short" && !("abstract" in rows.sessions[1]));
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
  check("abstract materialised beside the description", a.abstract === "A in short" && a.description === "About A" && snap.sessionById.get("talk-b")!.abstract === undefined);
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

  // Pretalx's CLS type names fold into the app's core formats at read time;
  // the stored row keeps the Pretalx name.
  const clsRows = normalizeBundle(
    {
      ...FIXTURE,
      sessions: [
        { ...FIXTURE.sessions[0], id: "c1", type: "CLS - Talk (Open Tech Summit)" },
        { ...FIXTURE.sessions[0], id: "c2", type: "CLS - EPF Talk" },
        { ...FIXTURE.sessions[0], id: "c3", type: "CLS - Lightning (Academic track)" },
        { ...FIXTURE.sessions[0], id: "c4", type: "CLS - career workshop (Career fair)" },
        { ...FIXTURE.sessions[0], id: "c5", type: "CLS - Miniworkshop (Open Tech Summit)" },
        { ...FIXTURE.sessions[0], id: "c6", type: "CLS - Panel (Open Tech Summit)" },
        { ...FIXTURE.sessions[0], id: "c7", type: "CLS - Demo (OTS)" },
        { ...FIXTURE.sessions[0], id: "c8", type: "Keynote - longer format" },
        { ...FIXTURE.sessions[0], id: "c10", type: "CLS - Fireside chat (Academic track)" },
        { ...FIXTURE.sessions[0], id: "c11", type: "Roundtable - longer format" },
        { ...FIXTURE.sessions[0], id: "c9", track: "Community Hubs" },
      ],
    },
    "devcon-7",
    1_000
  );
  const clsSnap = materialize(clsRows, "devcon-7");
  const formatOf = (id: string) => clsSnap.sessionById.get(id)!.type;
  check("CLS talks fold into Talk", formatOf("c1") === "Talk" && formatOf("c2") === "Talk");
  check("CLS lightning folds into Lightning Talk", formatOf("c3") === "Lightning Talk");
  check("CLS workshops fold into Workshop", formatOf("c4") === "Workshop" && formatOf("c5") === "Workshop");
  check("CLS panel folds into Panel", formatOf("c6") === "Panel");
  check("unknown CLS format keeps its own name", formatOf("c7") === "Demo");
  check("non-CLS type drops its qualifier", formatOf("c8") === "Keynote");
  check("one-off formats read as Mixed Format", formatOf("c10") === "Mixed Format" && formatOf("c11") === "Mixed Format");
  check("plain types untouched", a.type === "Talk");
  check("stored row keeps the Pretalx name", clsRows.sessions[0].type === "CLS - Talk (Open Tech Summit)");
  check("the Pretalx \"Community Hubs\" track reads as no track", clsSnap.sessionById.get("c9")!.track === "" && clsRows.sessions.find((r) => r.id === "c9")!.track === "Community Hubs");

  const empty = emptySnapshot("x");
  check("empty snapshot", empty.sessions.length === 0 && empty.event === undefined && empty.sessionById.size === 0);
  // Devcon 8 rooms: app display names and the timeline lane order are keyed
  // by Pretalx room id; the stored row keeps the Pretalx name.
  const dc8Rows = normalizeBundle(
    {
      ...FIXTURE,
      // Ids and names as `GET /events/devcon8/rooms` serves them (2026-10-15).
      rooms: [
        { id: "workshop-1", name: "Workshop 1" },
        { id: "jasmine-stage-4", name: "Jasmine Stage 4" },
        { id: "lightning-stage", name: "Lightning Stage" },
        { id: "music-stage", name: "Music stage" },
        { id: "lotus-stage-1", name: "Lotus Stage 1" },
        { id: "main-stage-lotus", name: "Main Stage (Lotus)" },
        { id: "community-led-stage", name: "Community Led Stage" },
        { id: "classroom-z", name: "Classroom Z" },
      ],
      sessions: ["workshop-1", "jasmine-stage-4", "lightning-stage", "music-stage", "lotus-stage-1", "main-stage-lotus", "community-led-stage", "classroom-z"].map((room, i) => ({
        ...FIXTURE.sessions[0],
        id: `r${i}`,
        slot_roomId: room,
      })),
    },
    "devcon8",
    1_000
  );
  const dc8 = materialize(dc8Rows, "devcon8");
  check("room display names applied at read time", dc8.roomById.get("music-stage")!.name === "Music Stage" && dc8.roomById.get("jasmine-stage-4")!.name === "Jasmine Stage 4" && dc8.roomById.get("main-stage-lotus")!.name === "Main Stage (Lotus)");
  check("stored rows keep the Pretalx room name", dc8Rows.rooms.find((r) => r.id === "music-stage")!.name === "Music stage");
  check(
    "timeline lanes follow the Devcon 8 order, Main Stage first, unknown rooms after",
    eq(sortRooms(dc8.sessions), ["Main Stage (Lotus)", "Lotus Stage 1", "Jasmine Stage 4", "Lightning Stage", "Community Led Stage", "Workshop 1", "Music Stage", "Classroom Z"])
  );
  check(
    "Locations filter: Main Stage first, then families A–Z with the hall before its numbered parts",
    eq(
      ["Workshop 2", "Lotus Stage 3", "Music Stage", "Main Stage (Lotus)", "Lotus Stage 1", "CLS - Builders Room", "Workshop 1", "Lotus Stage", "Jasmine Stage 4", "Community Led Stage", "Lightning Stage", "Lotus Stage 2"].sort(compareRoomNames),
      ["Main Stage (Lotus)", "CLS - Builders Room", "Community Led Stage", "Jasmine Stage 4", "Lightning Stage", "Lotus Stage", "Lotus Stage 1", "Lotus Stage 2", "Lotus Stage 3", "Music Stage", "Workshop 1", "Workshop 2"]
    )
  );
  check("room screen aliases: the Music Stage shows its hub programme too", eq(roomScreenRoomIds("music-stage"), ["music-stage", "community-hub-music-stage"]) && eq(roomScreenRoomIds("lotus-stage-1"), ["lotus-stage-1"]));
  check("room screen icons follow the renamed Devcon 8 ids", roomIconUrl("main-stage-lotus")!.endsWith("/lotus.png") && roomIconUrl("lotus-stage-2")!.endsWith("/lotus.png") && roomIconUrl("lightning-stage")!.endsWith("/lightning-stage.png") && roomIconUrl("workshop-2")!.endsWith("/workshop.png") && roomIconUrl("stage-1")!.endsWith("/lotus.png"));
  check("timeline lanes for other events keep the Main Stage / Stage … / A–Z rule", eq(sortRooms(snap.sessions), ["Stage 1", "TBA"]));

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

function testInstallVersion() {
  check("install version: parsed from the launch URL", parseInstallVersion("1") === 1 && parseInstallVersion("12") === 12);
  check(
    "install version: absent or malformed is null",
    [null, undefined, "", "0", "-1", "1.5", "abc"].every((raw) => parseInstallVersion(raw) === null)
  );
  check("install version: marker carried, or nothing", installMarker(3) === "?install=3" && installMarker(null) === "");
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

  check("tabPathOf tab routes", tabPathOf("/schedule") === "/schedule" && tabPathOf("/") === "/" && tabPathOf("/my-devcon") === "/my-devcon");
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
  check("has ticket: an email-matched ticket counts", hasAdmissionTicket(one) && hasAdmissionTicket(two));
  check("has ticket: an attached ticket counts", hasAdmissionTicket([order("B", [ticket("s9", { attached: true })])]));
  check("has ticket: swag alone or nothing does not", !hasAdmissionTicket(swagOnly) && !hasAdmissionTicket([]));

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

  check("link re-verification: 200 is ok", pretixLookupOutcome({ ok: true, status: 200 }) === "ok");
  check("link re-verification: 404 means the position or order is gone", pretixLookupOutcome({ ok: false, status: 404 }) === "missing");
  check("link re-verification: 429 and 500 fail without deleting anything", pretixLookupOutcome({ ok: false, status: 429 }) === "failed" && pretixLookupOutcome({ ok: false, status: 500 }) === "failed");
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

function testReminderCatalogue() {
  const main = parseReminderCatalogue({
    data: {
      rooms: [{ id: "stage-1", name: "Main Stage" }],
      sessions: [
        { id: "X3JSYF", title: "Opening", slot_start: 1_762_160_400_000, slot_roomId: "stage-1" },
        { id: "iso", title: "ISO start", slot_start: "2026-11-03T10:00:00.000Z", slot_roomId: "nowhere" },
        { id: "", title: "no id", slot_start: 1 },
        { id: "unscheduled", title: "no start" },
      ],
    },
  });
  check("reminder catalogue: rows keep id, start and room name; unscheduled and id-less rows drop", eq(main, [
    { id: "X3JSYF", title: "Opening", startMs: 1_762_160_400_000, roomName: "Main Stage" },
    { id: "iso", title: "ISO start", startMs: Date.parse("2026-11-03T10:00:00.000Z"), roomName: undefined },
  ]));
  const hubs = parseReminderCatalogue({
    data: {
      rooms: [{ id: "community-hub-privacy", name: "Privacy Hub" }],
      sessions: [{ id: "privacy-s01", title: "Coffee", slot_start: 1_762_160_400_000, slot_roomId: "community-hub-privacy" }],
    },
  });
  const merged = mergeReminderCatalogues(main, hubs, hubs);
  check("reminder catalogue: hub sessions join the Pretalx ones once, with the hub as their room", merged.length === 3 && merged[2].id === "privacy-s01" && merged[2].roomName === "Privacy Hub");
  check("reminder catalogue: an unreachable hubs programme is just an empty list", eq(mergeReminderCatalogues(main, []), main));
}

function testMeerkatHandover() {
  check("meerkat: slug session ids pass", isSessionId("opening-ceremony") && isSessionId("Session_01"));
  check("meerkat: empty, path-like or oversized ids fail", !isSessionId("") && !isSessionId("a/b") && !isSessionId("../x") && !isSessionId("-lead") && !isSessionId("x".repeat(200)));
  const url = new URL(meerkatSessionUrl("opening-ceremony", "a.b.c"));
  check("meerkat: hand-off lands on the session's Q&A page", url.origin === "https://app.meerkat.events" && url.pathname === "/e/opening-ceremony/qa");
  check("meerkat: token travels as the token query param", url.searchParams.get("token") === "a.b.c");
  check("meerkat: venue QR points at the session's Q&A page without a token", meerkatQaUrl("opening-ceremony") === "https://app.meerkat.events/e/opening-ceremony/qa");
  check("meerkat: room screens point at the stage presenter view, stage spelled like the room", meerkatStageUrl("Main Stage") === "https://app.meerkat.events/stage/Main%20Stage");
  check("meerkat id: Pretalx code first, slug for bundles without it", meerkatEventId({ id: "opening-ceremony", sourceId: "X3JSYF" }) === "X3JSYF" && meerkatEventId({ id: "opening-ceremony" }) === "opening-ceremony");
  check(
    "community hub topics: the hub's own name is not a topic, blanks are dropped, unknown hub ids resolve to nothing",
    JSON.stringify(communityHubTopics({ tags: ["Privacy Hub", " Zero knowledge ", ""] })) === JSON.stringify(["Zero knowledge"]) &&
      communityHubTopics({ tags: ["Privacy Hub"] }).length === 0 &&
      communityHubTopics({}).length === 0 &&
      findCommunityHub("privacy")?.name === "Privacy Hub" &&
      findCommunityHub("nope") === undefined
  );
  const tagged = (tags: string[], extra: object = {}) =>
    ({ tags, speakers: [{ id: "s" }], ...extra }) as unknown as Session;
  const hub = { room: { id: "community-hub-privacy" }, speakers: [] };
  check(
    "topic options: curated tags present, in curated order, then hub topics by frequency; uncurated and speakerless Pretalx tags dropped",
    eq(
      deriveTopicOptions([
        tagged(["EVM", "Security"]),
        tagged(["Scalability"]),
        tagged(["AI"], { speakers: [] }),
        tagged(["Privacy Hub", "Zero knowledge"], hub),
        tagged(["Privacy Hub", "Zero knowledge"], hub),
        tagged(["Privacy Hub", "Agents"], hub),
      ]),
      ["Security", "EVM", "Privacy Hub", "Zero knowledge", "Agents"]
    )
  );
  check(
    "community hubs dataset: follows the event, keyed apart from it, none for the test event",
    communityHubsDataset(DATASETS["devcon-7"])?.eventId === "devcon-7-community-hubs" &&
      communityHubsDataset(DATASETS["devcon-7"])?.communityHubsOf === "devcon-7" &&
      communityHubsDataset(DATASETS.devcon8)?.eventId === "devcon8-community-hubs" &&
      communityHubsDataset(DATASETS["test-devcon-8"]) === undefined
  );
  // Every dataset that ships a static bundle must ship one the store accepts.
  for (const dataset of [...Object.values(DATASETS), ...Object.values(COMMUNITY_HUB_DATASETS)]) {
    if (!dataset?.staticBundleUrl) continue;
    const file = JSON.parse(readFileSync(`public${dataset.staticBundleUrl}`, "utf8")) as { data: unknown };
    const parsed = BundleSchema.safeParse(file.data);
    check(
      `static bundle for ${dataset.key} parses and names its own event id`,
      parsed.success && parsed.data.event.id === dataset.eventId && parsed.data.sessions.length > 0
    );
  }
  check("room icon: map places resolve, others don't", roomIconUrl("main-stage") === "/maps/devcon-8/icons/lotus.png" && roomIconUrl("stage-5-cls") === "/maps/devcon-8/icons/lightning-stage.png" && roomIconUrl("cls-builders-room") === "/maps/devcon-8/icons/community-led-stage.png" && roomIconUrl("classroom-a") === null);
}

function testIosVersion() {
  const iphone = (os: string, version: string | null, browser = "") =>
    `Mozilla/5.0 (iPhone; CPU iPhone OS ${os} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ${browser}${version ? `Version/${version} ` : ""}Mobile/15E148 Safari/604.1`;
  check("ios version: Safari 27 despite the frozen OS 18_7 token", parseIosMajorVersion(iphone("18_7", "27.0")) === 27);
  check("ios version: Safari 26.5 reads Version, not OS", parseIosMajorVersion(iphone("18_7", "26.5")) === 26);
  check("ios version: iOS 18 Safari", parseIosMajorVersion(iphone("18_6_2", "18.6")) === 18);
  check("ios version: Chrome on iOS has no Version token, falls back to the OS token", parseIosMajorVersion(iphone("17_5", null, "CriOS/125.0 ")) === 17);
  check("ios version: iPad desktop mode reads Safari's Version", parseIosMajorVersion("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15") === 27);
  check("ios version: Android and desktop Chrome are null", parseIosMajorVersion("Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36") === null && parseIosMajorVersion("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/140.0 Safari/537.36") === null);
}

function testReminders() {
  // 2026-11-03 04:30 UTC = 10:00 Asia/Kolkata (devcon8 venue timezone).
  const start = Date.UTC(2026, 10, 3, 4, 30);
  const s = (id: string, startMs: number) => ({ id, startMs });
  const due = (nowMs: number) => dueSessions([s("a", start)], nowMs).length === 1;
  check("reminders: due exactly LEAD before start", due(start - REMINDER_LEAD_MS));
  check("reminders: due inside the window", due(start - 60_000));
  check("reminders: not due before the window", !due(start - REMINDER_LEAD_MS - 1));
  check("reminders: not due once started", !due(start));

  const session = (id: string, startSec: number, title: string, room?: { id: string; name: string }) =>
    ({ id, title, start: startSec, end: startSec + 1800, duration: 1800, track: "", speakers: [], room: room && { ...room, description: "", info: "" } }) as unknown as Parameters<typeof deriveReminders>[0][number];
  const sessions = [
    session("early", start / 1000 - 3600, "Earlier talk", { id: "stage-1", name: "Stage 1" }),
    session("now", start / 1000, "Talk now"),
    session("later", start / 1000 + 3600, "Later talk"),
    session("unstarred", start / 1000, "Not mine"),
  ];
  const starred = new Set(["early", "now", "later"]);
  const items = deriveReminders(sessions, starred, start - REMINDER_LEAD_MS);
  check("reminders: derived = starred sessions whose reminder time has passed, newest first",
    eq(items.map((r) => r.id), [reminderId("now"), reminderId("early")]));
  check("reminders: seconds → ms once, remindAt = start − LEAD",
    items[0].startMs === start && items[0].remindAtMs === start - REMINDER_LEAD_MS);
  check("reminders: room carried through", items[1].roomId === "stage-1" && items[1].roomName === "Stage 1" && items[0].roomName === undefined);
  check("reminders: unstarred excluded", !items.some((r) => r.sessionId === "unstarred"));
  check("reminders: nothing before the first reminder", deriveReminders(sessions, starred, start - 2 * 3600_000 - REMINDER_LEAD_MS - 1).length === 0);

  check("reminders: body in venue time with room",
    reminderBody("Talk now", start, "Asia/Kolkata", "Stage 1") === "Talk now starts in 10 minutes at 10:00, on Stage 1");
  check("reminders: body without room drops the clause",
    reminderBody("Talk now", start, "Asia/Kolkata") === "Talk now starts in 10 minutes at 10:00");
  check("reminders: body counts the real remaining minutes when claimed late",
    reminderBody("Talk now", start, "Asia/Kolkata", null, start - 4 * 60_000 - 30_000) === "Talk now starts in 5 minutes at 10:00");
  check("reminders: body never says 0 minutes",
    reminderBody("Talk now", start, "Asia/Kolkata", null, start - 10_000) === "Talk now starts in 1 minute at 10:00");
}

// --- AI planner: codes in, sessions out (src/data/ai/plan.ts) ---

function planSession(id: string, sourceId: string | undefined, start: number, minutes: number, title = id): Session {
  return {
    id,
    sourceId,
    title,
    track: "Core Protocol",
    duration: minutes,
    start,
    end: start + minutes * 60_000,
    speakers: [],
    room: { id: "r1", name: "Lotus Stage" },
  } as unknown as Session;
}

function testAiPlan() {
  check("parseCodeList splits on commas, spaces and lines, drops junk, dedupes case-insensitively", eq(
    parseCodeList(" 8LTCLM, shtldn\nprivacy-s03;8ltclm <script> "),
    ["8LTCLM", "shtldn", "privacy-s03"]
  ));
  check("parseCodeList caps the list", parseCodeList(Array.from({ length: 300 }, (_, i) => `C${i}`).join(",")).length === 200);
  const params = new URLSearchParams("add=A,B&add=C&remove=B,D");
  check("parsePlanParams merges repeated params and lets add win over remove", eq(parsePlanParams(params), { add: ["A", "B", "C"], remove: ["D"] }));

  const s1 = planSession("a-talk", "8LTCLM", T0, 30, "A talk");
  const s2 = planSession("b-talk", "SHTLDN", T0 + 15 * 60_000, 30, "B talk");
  const s3 = planSession("privacy-s03", undefined, T0 + 60 * 60_000, 40, "Hub chat");
  const s4 = planSession("c-talk", "CCCCCC", T0 + 120 * 60_000, 30, "C talk");
  const starred = new Set(["a-talk", "c-talk"]);
  const plan = resolvePlan({ add: ["8ltclm", "SHTLDN", "privacy-s03", "NOPE"], remove: ["c-talk", "b-talk"] }, [s1, s2, s3, s4], starred);
  check("resolvePlan matches codes and slugs, case-insensitively, across programmes", eq(plan.add.map((s) => s.id), ["b-talk", "privacy-s03"]));
  check("resolvePlan reports already starred adds", eq(plan.alreadyStarred.map((s) => s.id), ["a-talk"]));
  check("resolvePlan removes starred sessions by slug and skips the rest", eq(plan.remove.map((s) => s.id), ["c-talk"]) && eq(plan.notStarred, []));
  check("resolvePlan lists unknown codes", eq(plan.unknown, ["NOPE"]));

  check("planOverlaps pairs sessions that overlap in time", eq(planOverlaps([s3, s1, s2, s4]).map(([a, b]) => [a.id, b.id]), [["a-talk", "b-talk"]]));
  check("planOverlaps: touching sessions do not overlap", planOverlaps([s1, planSession("x", "X", s1.end, 30)]).length === 0);

  check("applyLink builds the apply URL", applyLink("https://app.devcon.org", ["A", "B"], ["C"]) === "https://app.devcon.org/my-interests?add=A%2CB&remove=C");
  check("applyLink with nothing to remove", applyLink("https://app.devcon.org", ["A"], []) === "https://app.devcon.org/my-interests?add=A");

  const prompt = buildAssistantPrompt({
    appOrigin: "https://app.devcon.org",
    eventId: "devcon8",
    eventTitle: "Devcon 8",
    dates: "3 to 6 November 2026",
    timezoneLabel: "Mumbai time (IST)",
    dayCount: 4,
    starred: [{ code: "8LTCLM", title: "A talk" }],
  });
  check("prompt points at the app's catalogue mirror", prompt.includes("Catalogue index: https://app.devcon.org/ai/devcon8"));
  check("prompt spells out the day pages for fetch tools that only open seen URLs", prompt.includes("https://app.devcon.org/ai/devcon8/day/1 , https://app.devcon.org/ai/devcon8/day/2 , https://app.devcon.org/ai/devcon8/day/3 , https://app.devcon.org/ai/devcon8/day/4"));
  check("prompt carries the current stars by code", prompt.includes("My current interests: 8LTCLM."));
  check("prompt explains the apply link", prompt.includes("https://app.devcon.org/my-interests?add=CODE1,CODE2&remove=CODE3"));
  check("prompt stays short enough for a URL prefill", prompt.length < 2600, `${prompt.length} chars`);
  {
    const many = Array.from({ length: 80 }, (_, i) => ({
      code: `C${String(i).padStart(5, "0")}`,
      title: `A fairly long session title number ${i} about something interesting`,
    }));
    const input = { appOrigin: "https://app.devcon.org", eventId: "devcon-8", eventTitle: "Devcon 8", dates: "3 to 6 November 2026", timezoneLabel: "Mumbai time (IST)", dayCount: 4, starred: many };
    const grok = assistantLink("grok", input);
    const chatgpt = assistantLink("chatgpt", input);
    check("grok link fits its URL budget with all 80 codes", grok.length <= ASSISTANT_URL_BUDGET.grok && grok.startsWith("https://grok.com/?q=") && grok.includes("C00079"));
    check("interests are codes only", !buildAssistantPrompt(input).includes("A fairly") && chatgpt.length <= ASSISTANT_URL_BUDGET.chatgpt);
    const huge = { ...input, starred: Array.from({ length: 400 }, (_, i) => ({ code: `LONGCODE${i}`, title: "t" })) };
    const capped = assistantLink("grok", huge);
    check("too many codes are capped with a count", capped.length <= ASSISTANT_URL_BUDGET.grok && capped.includes(encodeURIComponent("more already starred in the app")));
    const few = buildAssistantPrompt({ ...input, starred: many.slice(0, 3) }, { maxStarred: 2 });
    check("capped interests count the rest", few.includes("C00000, C00001, and 1 more already starred in the app"));
    const none = buildAssistantPrompt(input, { maxStarred: 0 });
    check("zero shown interests still count the rest", none.includes("My current interests: 80 more already starred in the app"));
  }
  {
    const base = {
      category: "bug",
      source: "feedback",
      message: "The map is blank",
      email: "a@b.co",
      page: "/map",
      diagnostics: { build: "abc1234", device: "iOS 18 Safari 18", displayMode: "installed", online: true, signedIn: false, dataset: { eventId: "devcon-8" }, push: { permission: "granted", subscribed: true } },
      files: [{ path: "2026-10/123e4567-e89b-12d3-a456-426614174000/shot.png", name: "shot.png", type: "image/png", size: 1234 }],
    };
    const valid = validateFeedbackPayload(base);
    check("feedback: valid payload passes", valid.ok);
    check("feedback: unknown category fails", !validateFeedbackPayload({ ...base, category: "rant" }).ok);
    check("feedback: bad email fails", !validateFeedbackPayload({ ...base, email: "nope" }).ok);
    check("feedback: empty message fails", !validateFeedbackPayload({ ...base, message: "  " }).ok);
    check("feedback: foreign file path fails", !validateFeedbackPayload({ ...base, files: [{ ...base.files[0], path: "../etc/passwd" }] }).ok);
    check("feedback: executables refused, images fine", fileProblem("x.exe", 10) !== null && fileProblem("x.png", 10) === null);
    check("feedback: file names are made safe", safeFileName("../Screen Shot 2026 (1).PNG") === "Screen_Shot_2026_1_.PNG");
    check(
      "feedback: iPhone UA summarised",
      summarizeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1") === "iOS 18 Safari 18"
    );
    check(
      "feedback: Android Chrome UA summarised",
      summarizeUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.58 Mobile Safari/537.36") === "Android 14 Chrome 130"
    );
    check(
      "feedback: Brave hint wins over the Chrome UA",
      summarizeUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36", { brave: true }) === "macOS Brave 130"
    );
    check("feedback: title from the first line", feedbackTitle({ category: "idea", source: "feedback", message: "\nDark mode please\nsecond" }) === "Idea: Dark mode please");
    check("feedback: crash title uses the error", feedbackTitle({ category: "bug", source: "crash", message: "tapped star", error: { message: "x is not a function" } }) === "Crash: x is not a function");
    check("feedback: rich text chunking", chunkText("a".repeat(4500)).length === 3 && chunkText("").length === 1);
    if (valid.ok) {
      const links = [{ name: "shot.png", url: "https://files.example/shot.png?token=1", type: "image/png" }];
      const props = feedbackProperties(valid.value, links) as Record<string, { select?: { name: string }; checkbox?: boolean; files?: unknown[]; email?: string }>;
      check(
        "feedback: Notion properties map the diagnostics",
        props["Display mode"]?.select?.name === "Installed" && props.Online?.checkbox === true && props["Signed in"]?.checkbox === false && props.Email?.email === "a@b.co" && props.Files?.files?.length === 1
      );
      const body = JSON.stringify(feedbackChildren(valid.value, links));
      check("feedback: page body has the image and the diagnostics", body.includes('"type":"image"') && body.includes('"language":"json"'));
    }
  }
  check("prompt without stars says so", buildAssistantPrompt({ appOrigin: "x", eventId: "e", eventTitle: "E", dates: "", timezoneLabel: "", dayCount: 0, starred: [] }).includes("My current interests: none yet."));
  const ds = { ...DATASETS.devcon8, apiUrl: "https://api.devcon.org/", eventId: "devcon8" };
  check("catalogueDataset: default without ?event, by API event id with it, unknown is undefined",
    catalogueDataset(null) !== undefined && catalogueDataset("devcon8")?.eventId === "devcon8" && catalogueDataset("nope") === undefined);
  check("upstreamCatalogueUrl: one path per page, query only on search (unknown params dropped)",
    upstreamCatalogueUrl(ds, "index", new URLSearchParams("")) === "https://api.devcon.org/events/devcon8/ai"
    && upstreamCatalogueUrl(ds, "day", new URLSearchParams("q=ignored"), "2") === "https://api.devcon.org/events/devcon8/ai/day/2"
    && upstreamCatalogueUrl(ds, "sessions", new URLSearchParams("")) === "https://api.devcon.org/events/devcon8/ai/sessions"
    && upstreamCatalogueUrl(ds, "ids", new URLSearchParams(""), "A,B") === "https://api.devcon.org/events/devcon8/ai/ids/A%2CB"
    && upstreamCatalogueUrl(ds, "search", new URLSearchParams("day=2&q=zk&utm=x")) === "https://api.devcon.org/events/devcon8/ai/search?day=2&q=zk");
  check("mirrorCatalogueUrl is the event's index path", mirrorCatalogueUrl("https://app.devcon.org", "devcon8") === "https://app.devcon.org/ai/devcon8");
  const page = "Day 1: https://api.devcon.org/events/devcon8/ai/day/1\nIndex: https://api.devcon.org/events/devcon8/ai\nIds: https://api.devcon.org/events/devcon8/ai/ids/A,B";
  check("rewriteCatalogueLinks moves every API link onto the mirror", rewriteCatalogueLinks(page, ds, "https://app.devcon.org") ===
    "Day 1: https://app.devcon.org/ai/devcon8/day/1\nIndex: https://app.devcon.org/ai/devcon8\nIds: https://app.devcon.org/ai/devcon8/ids/A,B");
  check("requestOrigin prefers the forwarded host over the deploy's internal URL",
    requestOrigin(new Request("https://abc123--site.netlify.app/ai", { headers: { "x-forwarded-host": "app.devcon.org", "x-forwarded-proto": "https" } })) === "https://app.devcon.org"
    && requestOrigin(new Request("http://localhost:3000/ai", { headers: { host: "localhost:3000", "x-forwarded-proto": "http" } })) === "http://localhost:3000"
    && requestOrigin(new Request("https://app.devcon.org/ai")) === "https://app.devcon.org");
  check("assistant links prefill a new chat", assistantUrl("chatgpt", "a b").startsWith("https://chatgpt.com/?q=a%20b") && assistantUrl("claude", "a b") === "https://claude.ai/new?q=a%20b" && assistantUrl("grok", "a b") === "https://grok.com/?q=a%20b");
}

function testLegacySessionLink() {
  const devcon8 = DATASETS.devcon8;
  check(
    "legacy link: a Pretalx code is six capitals or digits, never a slug",
    isPretalxCode("DNNSNX") && isPretalxCode("YSMVJE") &&
      !isPretalxCode("dnnsnx") && !isPretalxCode("DNNSN") && !isPretalxCode("opening-ceremony")
  );
  check(
    "legacy link: this event's code opens the session here",
    sessionLinkFor({ id: "pq-ethereum-qanda", eventId: "devcon8" }, devcon8) === "/schedule/pq-ethereum-qanda"
  );
  check(
    "legacy link: a Devcon 7 code goes to the archive",
    sessionLinkFor({ id: "opening-ceremony", eventId: "devcon-7" }, devcon8) ===
      "https://archive.devcon.org/devcon-7/opening-ceremony/"
  );
  check(
    "legacy link: other events have no page to send to",
    sessionLinkFor({ id: "opening-ceremony", eventId: "test-devcon-8" }, devcon8) === null
  );
}

function testProgramme() {
  console.log("\n== programme membership");
  check("[CLS] track is community-led", isCommunityLed(mkSession("a", "[CLS] - OTS")));
  check("padded [CLS] track is community-led", isCommunityLed(mkSession("b", "  [CLS] -OTS ")));
  check("plain track is not", !isCommunityLed(mkSession("c", "Core Protocol")));
  check("empty track is not", !isCommunityLed(mkSession("d", "")));
  check("hub session is in hubs", programmeOf(mkSession("h", "", "community-hub-privacy")) === "hubs");
  check("CLS session is in hubs", programmeOf(mkSession("a", "[CLS] - EPF", "workshop-2")) === "hubs");
  check("Devcon session is in main", programmeOf(mkSession("c", "Security", "workshop-2")) === "main");
  const main = [mkSession("c", "Security"), mkSession("a", "[CLS] - OTS"), mkSession("e", "")];
  const hubs = [mkSession("h", "", "community-hub-privacy")];
  const mainView = programmeSessions(main, hubs, "main");
  const hubsView = programmeSessions(main, hubs, "hubs");
  check("main view drops CLS, keeps order", eq(mainView.map((s) => s.id), ["c", "e"]));
  check("community view is CLS then hubs", eq(hubsView.map((s) => s.id), ["a", "h"]));
  check("views partition the union", mainView.length + hubsView.length === main.length + hubs.length && !mainView.some((s) => hubsView.includes(s)));
  check("empty hub store still yields CLS", eq(programmeSessions(main, [], "hubs").map((s) => s.id), ["a"]));

  // The community-led registry: known tracks by exact match, unknown ones
  // synthesised so a new community never breaks the view.
  check("known track resolves", communityLedGroup("[CLS] - OTS")?.id === "ots" && communityLedGroup("[CLS] - OTS")?.name === "Open Tech Summit");
  check("padded known track resolves", communityLedGroup("  [CLS] - Defi 101 ")?.id === "defi-101");
  const unknown = communityLedGroup("[CLS] - New Thing");
  check("unknown track synthesises", unknown?.id === "new-thing" && unknown.name === "New Thing" && unknown.badge === "New Thing" && unknown.color === "#e9e5f6" && !unknown.logo);
  check("non-CLS track has no group", communityLedGroup("Security") === undefined && communityLedGroup(undefined) === undefined);
  // A known group under another spelling of its track (a separator or padding
  // edit in Pretalx) keeps the registry's name and colour, never a second theme.
  check("known track under another spelling resolves", communityLedGroup("[CLS]: OTS")?.name === "Open Tech Summit" && communityLedGroup("  [CLS] -OTS ")?.color === communityLedGroup("[CLS] - OTS")?.color);
  check("communityOf follows the spelling-tolerant lookup", communityOf(mkSession("x", "  [CLS] -OTS "))?.color === communityLedGroup("[CLS] - OTS")?.color);
  // The filter panel groups community-led options by the days they run on:
  // one entry per community, carrying every venue day of its sessions, sorted.
  const dayA = T0 / 1000;
  const dayB = dayA + 86400;
  const optionDays = communityOptions([
    { ...mkSession("o2", "[CLS] - OTS"), start: dayB },
    { ...mkSession("o1", "[CLS] - OTS"), start: dayA },
    { ...mkSession("o3", "[CLS] - OTS"), start: dayA + 60 },
    { ...mkSession("e1", "[CLS] - EPF"), start: dayB },
  ]);
  check("communityOptions collects each community's days, sorted and deduped", eq(optionDays.map((c) => [c.id, c.days]), [["epf", [eventDayKey(dayB * 1000)]], ["ots", [eventDayKey(dayA * 1000), eventDayKey(dayB * 1000)]]]));
  check("clsTrackName strips marker and separator", clsTrackName("[CLS] - EPF") === "EPF" && clsTrackName("[CLS]: OTS") === "OTS");
  check("eight groups, unique ids and tracks", COMMUNITY_LED_GROUPS.length === 8 && new Set(COMMUNITY_LED_GROUPS.map((g) => g.id)).size === 8 && new Set(COMMUNITY_LED_GROUPS.map((g) => g.track)).size === 8);
  const taken = new Set([...DC8_TRACKS.map((t) => t.color.toLowerCase()), ...COMMUNITY_HUBS.map((h) => h.color.toLowerCase())]);
  check("group colours are pastels of their own", COMMUNITY_LED_GROUPS.every((g) => /^#[0-9a-f]{6}$/i.test(g.color) && !taken.has(g.color.toLowerCase())) && new Set(COMMUNITY_LED_GROUPS.map((g) => g.color.toLowerCase())).size === 8);
  const hubRef = communityOf(mkSession("h", "", "community-hub-privacy"));
  check("hub ref", hubRef?.key === "hub:privacy" && hubRef.kind === "hub" && hubRef.name === "Privacy Hub" && hubRef.badge === "Privacy" && !!hubRef.logo);
  const clsRef = communityOf(mkSession("a", "[CLS] - Academic", "workshop-1"));
  check("CLS ref", clsRef?.key === "cls:academic" && clsRef.kind === "cls" && clsRef.name === "Academic Track" && clsRef.badge === "Academic");
  check("Devcon session has no community", communityOf(mkSession("c", "Security", "workshop-1")) === undefined);
  const opts = communityOptions([mkSession("1", "[CLS] - OTS"), mkSession("2", "", "community-hub-privacy"), mkSession("3", "[CLS] - OTS"), mkSession("4", "[CLS] - Academic"), mkSession("5", "Security")]);
  check("options unique and sorted by name", eq(opts.map((o) => o.key), ["cls:academic", "cls:ots", "hub:privacy"]));
}

function testTrackTheme() {
  console.log("\n== track theme");
  const ots = getTrackTheme("[CLS] - OTS");
  check("CLS track themes as its group", ots.name === "Open Tech Summit" && ots.badge === "OTS" && ots.isCLS === true && ots.isCommunity === true && ots.isHub !== true);
  check("CLS badge and full label", trackBadgeLabel("[CLS] - OTS") === "OTS" && trackFullLabel("[CLS] - OTS") === "Open Tech Summit");
  const novel = getTrackTheme("[CLS] - New Thing");
  check("unknown CLS track keeps a name and the fallback colour", novel.badge === "New Thing" && novel.color === "#e9e5f6" && novel.isCLS === true);
  const hub = getTrackTheme("[CLS] - OTS", "community-hub-privacy");
  check("hub room wins over the track", hub.isHub === true && hub.isCommunity === true && hub.name === "Privacy Hub");
  check("Devcon tracks are not community", getTrackTheme("Security").isCommunity !== true && getTrackTheme("").isCommunity !== true);
}

/**
 * Without IndexedDB (WebKit's Lockdown Mode removes it from every browser on
 * the device) the database opens on an in-memory engine and every Dexie call
 * works for the session. Node has no IndexedDB either, so this is that path.
 */
async function testMemoryStorage() {
  check("precondition: no IndexedDB in this runtime", typeof globalThis.indexedDB === "undefined");
  check("cacheDB is null until the boot gate opens it", cacheDB === null);
  const mode = await openCacheDB();
  check("opens in memory mode without IndexedDB", mode === "memory");
  check("cacheDB is set after open", cacheDB !== null);
  await cacheDB.cache.put({ key: "k", value: { a: 1 }, timestamp: 5 });
  check("round trip through the memory db", eq((await cacheDB.cache.get("k"))?.value, { a: 1 }));
  const recent = await cacheDB.cache.where("timestamp").above(1).toArray();
  check("where() works on the memory db (the boot path that crashed)", recent.length === 1);
  check("a second open keeps the db and its mode", (await openCacheDB()) === "memory");
  // Dexie's open path on Safari polls indexedDB.databases() on the global, not
  // on the dependency it was given, so memory mode must install the globals.
  check(
    "memory mode installs the engine as the indexedDB global",
    typeof globalThis.indexedDB === "object" && typeof globalThis.indexedDB.databases === "function"
  );
}

function testPreviewAccess() {
  console.log("\n--- release gate preview access ---");
  const gates = ["ensPerk", "faucetPerk", "venueMap"] as const;
  check("team email previews every unreleased feature", previewableGates("someone@ethereum.org", gates).join(",") === gates.join(","));
  check("team check is case-insensitive", isTeamEmail("Someone@Ethereum.org"));
  check("@ens.domains previews the ENS perk only", previewableGates("someone@ens.domains", gates).join(",") === "ensPerk");
  check("partner domain is case-insensitive", previewableGates("Someone@ENS.domains", gates).join(",") === "ensPerk");
  check("partner domain is a suffix, not a substring", previewableGates("ens.domains@example.com", gates).length === 0);
  check("partner is not the team", !isTeamEmail("someone@ens.domains"));
  check("other accounts preview nothing", previewableGates("someone@example.com", gates).length === 0);
  check("signed out previews nothing", previewableGates(undefined, gates).length === 0);
  check("a released feature is not listed", previewableGates("someone@ens.domains", ["venueMap"]).length === 0);
}

function testTeamTestPush() {
  console.log("\n--- team test push (Notion \"Test push\" checkbox) ---");
  const row = (status: "draft" | "scheduled" | "sending" | "sent", flag: boolean) => ({ status, flag });
  check("new row, unticked: draft", nextTestStatus(undefined, false) === "draft");
  check("new row, ticked: scheduled", nextTestStatus(undefined, true) === "scheduled");
  check("tick after a sent test re-arms it", nextTestStatus(row("sent", false), true) === "scheduled");
  check("tick after a cancelled test re-arms it", nextTestStatus(row("draft", false), true) === "scheduled");
  check("still ticked, scheduled: unchanged", nextTestStatus(row("scheduled", true), true) === "scheduled");
  check("still ticked, sending: unchanged", nextTestStatus(row("sending", true), true) === "sending");
  check("still ticked, sent: no second send", nextTestStatus(row("sent", true), true) === "sent");
  check("untick before the minute tick cancels", nextTestStatus(row("scheduled", true), false) === "draft");
  check("untick during a send does not cancel it", nextTestStatus(row("sending", true), false) === "sending");
  check("untick after a send keeps the history", nextTestStatus(row("sent", true), false) === "sent");
  check("test title is prefixed", testPushTitle("Doors open at 9am") === "Test: Doors open at 9am");
  check("Notion checkboxes map by audience", eq(notionTestFlags({ "Test push (team)": { checkbox: true } }), { team: true, product: false }));
  check("missing checkboxes read as unticked", eq(notionTestFlags({}), { team: false, product: false }));
  check("env email list: trimmed, lower-cased, de-duplicated", eq(parseEmailList(" A@example.org, b@example.org,a@example.org "), ["a@example.org", "b@example.org"]));
  check("env email list: unset or empty reaches nobody", eq(parseEmailList(undefined), []) && eq(parseEmailList(" , "), []));
  check("product team list reads its env var", eq(productTeamEmails({ PUSH_PRODUCT_TEAM_EMAILS: "x@example.org" }), ["x@example.org"]));
}

async function testSessionCookieSettled() {
  console.log("\n--- the return after sign-in waits for the session cookie mirror ---");
  const realFetch = globalThis.fetch;
  let resolveFetch: ((r: Response) => void) | null = null;
  globalThis.fetch = (() => new Promise<Response>((res) => { resolveFetch = res; })) as typeof fetch;
  const probe = (ms: number) => Promise.race([whenSessionCookieSettled(1000).then(() => "settled"), new Promise<string>((r) => setTimeout(() => r("pending"), ms))]);
  try {
    check("nothing in flight: settles at once", (await probe(50)) === "settled");
    const sync = syncSessionCookie({ access_token: "a1", refresh_token: "r1" } as AuthSession);
    check("mirror in flight: waits", (await probe(50)) === "pending");
    resolveFetch!(new Response("{}", { status: 200 }));
    await sync;
    check("mirror done: settles", (await probe(50)) === "settled");
    const hung = syncSessionCookie({ access_token: "a2", refresh_token: "r2" } as AuthSession);
    const t = Date.now();
    await whenSessionCookieSettled(80);
    const waited = Date.now() - t;
    check("hung mirror: the wait is bounded", waited >= 70 && waited < 500, `${waited}ms`);
    resolveFetch!(new Response("{}", { status: 200 }));
    await hung;
  } finally {
    globalThis.fetch = realFetch;
  }
}

function testAuthCookieParser() {
  console.log("\n--- server reads the session cookie without refreshing it ---");
  const url = "https://abcdefghijklmnopqrst.supabase.co";
  const key = authCookieName(url);
  check("cookie name follows the project ref", key === "sb-abcdefghijklmnopqrst-auth-token");
  const session = { access_token: "eyJ.access.sig", refresh_token: "refresh-1", expires_at: 1_800_000_000, user: { id: "u1" } };
  const json = JSON.stringify(session);
  const b64 = "base64-" + Buffer.from(json, "utf8").toString("base64url");
  const picked = (v: ReturnType<typeof parseAuthCookie>) => v && [v.access_token, v.refresh_token].join("|");
  check("plain JSON cookie", picked(parseAuthCookie([{ name: key, value: json }], url)) === "eyJ.access.sig|refresh-1");
  check("base64url cookie (the package's default encoding)", picked(parseAuthCookie([{ name: key, value: b64 }], url)) === "eyJ.access.sig|refresh-1");
  const cut = Math.floor(b64.length / 2);
  check("chunked cookie (.0 + .1) is reassembled in order", picked(parseAuthCookie([{ name: `${key}.1`, value: b64.slice(cut) }, { name: `${key}.0`, value: b64.slice(0, cut) }], url)) === "eyJ.access.sig|refresh-1");
  check("another project's cookie is ignored", parseAuthCookie([{ name: "sb-otherprojectrefxxxx-auth-token", value: json }], url) === null);
  check("garbage is null, not a throw", parseAuthCookie([{ name: key, value: "base64-!!!" }], url) === null && parseAuthCookie([{ name: key, value: "{not json" }], url) === null);
  check("a session without an access token is null", parseAuthCookie([{ name: key, value: JSON.stringify({ refresh_token: "r" }) }], url) === null);
  check("no cookies at all is null", parseAuthCookie([], url) === null);
  const b64url = (v: string) => Buffer.from(v, "utf8").toString("base64url");
  const token = (exp: number) => `${b64url('{"alg":"HS256","typ":"JWT"}')}.${b64url(JSON.stringify({ sub: "x", exp }))}.signature`;
  check("jwt expiry read from the payload, no verification needed", jwtExpiresAt(token(1_800_000_000)) === 1_800_000_000);
  check("malformed token has no expiry", jwtExpiresAt("abc") === null && jwtExpiresAt("a.b.c") === null && jwtExpiresAt("") === null);
}

async function testHealScript() {
  console.log("\n--- Meerkat hand-off page heals its cookie from the app's own session ---");
  const cfg = { storageKey: "sb-abcdefghijklmnopqrst-auth-token", supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co", anonKey: "anon-key" };
  const href = "https://app.example/api/meerkat/go?session=ABC123";
  const refreshUrl = `${cfg.supabaseUrl}/auth/v1/token?grant_type=refresh_token`;
  const proxyUrl = "https://app.example/supabase/auth/v1/token?grant_type=refresh_token";
  const nowS = () => Math.floor(Date.now() / 1000);
  interface Call { url: string; init: { method?: string; headers?: Record<string, string>; body?: string; credentials?: string } }
  type Answer = { status: number; body?: unknown } | "network";
  interface Run { calls: Call[]; replaced: string | null; stored: () => unknown; waitHidden: boolean; failHidden: boolean; retryHidden: boolean; title: string; lockName: string | null; lockMode: string | null }
  async function run(stored: unknown, answer: (call: Call, n: number) => Answer, opts: { locks?: boolean; writable?: boolean } = {}): Promise<Run> {
    const store = new Map<string, string>();
    if (stored !== null) store.set(cfg.storageKey, typeof stored === "string" ? stored : JSON.stringify(stored));
    const calls: Call[] = [];
    const out: Run = {
      calls, replaced: null, waitHidden: false, failHidden: true, retryHidden: true, title: "Q&A - App", lockName: null, lockMode: null,
      stored: () => { const v = store.get(cfg.storageKey); return v === undefined ? null : JSON.parse(v); },
    };
    const wait = { get hidden() { return out.waitHidden; }, set hidden(v: boolean) { out.waitHidden = v; } };
    const fail = { get hidden() { return out.failHidden; }, set hidden(v: boolean) { out.failHidden = v; }, getAttribute: (n: string) => (n === "data-title" ? "Sign in first - App" : null) };
    const retry = { get hidden() { return out.retryHidden; }, set hidden(v: boolean) { out.retryHidden = v; }, getAttribute: (n: string) => (n === "data-title" ? "Try again in a moment - App" : null) };
    const timers: NodeJS.Timeout[] = [];
    let parsing = true;
    const sandbox = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { if (opts.writable === false) throw new Error("QuotaExceededError"); store.set(k, String(v)); },
        removeItem: (k: string) => store.delete(k),
      },
      fetch: async (url: string, init: Call["init"]) => {
        const call = { url, init }; calls.push(call);
        const a = answer(call, calls.length);
        if (a === "network") throw new TypeError("Failed to fetch");
        return { ok: a.status < 300, status: a.status, json: async () => a.body };
      },
      location: { href, origin: "https://app.example", replace: (u: string) => { out.replaced = u; } },
      // The script sits in <head>: while it runs, the body is not parsed yet and lookups return null.
      document: { getElementById: (id: string) => (parsing ? null : id === "heal-wait" ? wait : id === "heal-fail" ? fail : id === "heal-retry" ? retry : null), get title() { return out.title; }, set title(v: string) { out.title = v; } },
      navigator: opts.locks === false ? {} : { locks: { request: (name: string, o: { mode: string }, fn: () => unknown) => { out.lockName = name; out.lockMode = o.mode; return Promise.resolve().then(fn); } } },
      URL, console, clearTimeout, AbortController,
      setTimeout: (fn: () => void, ms: number) => { const t = setTimeout(fn, ms); t.unref(); timers.push(t); return t; },
    };
    vm.runInNewContext(healScriptBody(cfg), sandbox);
    parsing = false;
    await new Promise((r) => setTimeout(r, 50));
    timers.forEach(clearTimeout);
    return out;
  }
  const ok = { status: 200 };
  const live = { access_token: "eyJ.live.sig", refresh_token: "r1", expires_at: nowS() + 3600, user: { id: "u1" } };
  const stale = { ...live, access_token: "eyJ.stale.sig", expires_at: nowS() - 60 };
  const renewed = { access_token: "eyJ.new.sig", refresh_token: "r2", token_type: "bearer", expires_in: 3600, user: { id: "u1" } };
  const body = (c: Call) => JSON.parse(c.init.body ?? "{}") as Record<string, string>;
  const urls = (r: Run) => r.calls.map((c) => c.url).join(",");
  const retried = `${href}&retried=1`;
  // What the page ends on: still waiting, the sign-in content, or the try-again content.
  const shows = (r: Run) => (r.replaced ? "reload" : !r.waitHidden ? "waiting" : !r.failHidden && r.retryHidden ? "sign-in" : r.failHidden && !r.retryHidden ? "try-again" : "both?!");

  let r = await run(null, () => ok);
  check("no stored session: nothing fetched, sign-in content revealed", r.calls.length === 0 && shows(r) === "sign-in", shows(r));
  r = await run("{not json", () => ok);
  check("garbage in storage: sign-in content, no throw", r.calls.length === 0 && shows(r) === "sign-in", shows(r));

  r = await run(live, () => ok);
  check("live session: mirrored once, then the page reloads with retried=1", r.calls.length === 1 && r.calls[0].url === "/api/auth/session" && r.calls[0].init.method === "POST" && body(r.calls[0]).access_token === "eyJ.live.sig" && body(r.calls[0]).refresh_token === "r1" && r.replaced === retried, `${urls(r)} -> ${r.replaced}`);
  check("live session: storage untouched, waiting state kept until the reload", eq(r.stored(), live) && !r.waitHidden && r.failHidden && r.retryHidden);
  check("runs under auth-js's own cross-tab lock", r.lockName === `lock:${cfg.storageKey}` && r.lockMode === "exclusive", `${r.lockName} ${r.lockMode}`);

  r = await run(stale, (c) => (c.url === refreshUrl ? { status: 200, body: renewed } : ok));
  check("expired session: refreshed at Supabase with the anon key, then the new pair mirrored", r.calls.length === 2 && r.calls[0].url === refreshUrl && r.calls[0].init.headers?.apikey === cfg.anonKey && body(r.calls[0]).refresh_token === "r1" && r.calls[1].url === "/api/auth/session" && body(r.calls[1]).access_token === "eyJ.new.sig" && body(r.calls[1]).refresh_token === "r2" && r.replaced === retried, urls(r));
  const written = (r.stored() ?? {}) as Partial<typeof renewed> & { expires_at?: number };
  check("expired session: the new session is written back for the app, with expires_at", written.access_token === "eyJ.new.sig" && written.refresh_token === "r2" && written.user?.id === "u1" && typeof written.expires_at === "number" && Math.abs(written.expires_at - (nowS() + 3600)) <= 5, JSON.stringify(written.expires_at));

  r = await run({ ...live, expires_at: nowS() + HEAL_EXPIRY_MARGIN_S - 5 }, (c) => (c.url === refreshUrl ? { status: 200, body: renewed } : ok));
  check("a token about to expire is refreshed rather than mirrored", r.calls[0]?.url === refreshUrl && r.replaced === retried, urls(r));

  r = await run(stale, (c) => (c.url === refreshUrl ? { status: 400, body: { error: "invalid_grant" } } : ok));
  check("refresh refused: nothing mirrored, storage left to the app, sign-in content with its title", r.calls.length === 1 && eq(r.stored(), stale) && shows(r) === "sign-in" && r.title === "Sign in first - App", shows(r));

  r = await run(stale, (c) => (c.url === refreshUrl ? { status: 429, body: { code: 429 } } : ok));
  check("rate-limited refresh: try-again content, storage untouched, nothing mirrored", r.calls.length === 1 && eq(r.stored(), stale) && shows(r) === "try-again" && r.title === "Try again in a moment - App", shows(r));
  r = await run(stale, (c) => (c.url === refreshUrl ? { status: 503 } : ok));
  check("Supabase 5xx on refresh: try-again content", r.calls.length === 1 && eq(r.stored(), stale) && shows(r) === "try-again", shows(r));

  r = await run(stale, (c) => (c.url === refreshUrl ? "network" : c.url === proxyUrl ? { status: 200, body: renewed } : ok));
  check("Supabase unreachable: the same-origin proxy is tried, without credentials", r.calls[1]?.url === proxyUrl && r.calls[1].init.credentials === "omit" && r.calls[1].init.headers?.apikey === cfg.anonKey && r.replaced === retried, urls(r));

  r = await run(stale, () => "network");
  check("everything unreachable: try-again content, storage untouched", r.calls.length === 2 && eq(r.stored(), stale) && shows(r) === "try-again", shows(r));

  r = await run(live, () => "network");
  check("live session but the mirror route unreachable: try-again, no refresh attempted", r.calls.length === 1 && r.calls[0].url === "/api/auth/session" && shows(r) === "try-again", `${urls(r)} ${shows(r)}`);
  r = await run(live, () => ({ status: 503 }));
  check("live session but the mirror route down: try-again", r.calls.length === 1 && shows(r) === "try-again", shows(r));

  r = await run(live, (c, n) => (c.url === "/api/auth/session" && n === 1 ? { status: 401 } : c.url === refreshUrl ? { status: 200, body: renewed } : ok));
  check("server refuses a token the device clock calls live: refreshed once, then mirrored", r.calls.length === 3 && r.calls[1].url === refreshUrl && body(r.calls[2]).access_token === "eyJ.new.sig" && r.replaced === retried, urls(r));

  r = await run(stale, (c) => (c.url === refreshUrl ? { status: 200, body: renewed } : { status: 401 }));
  check("refreshed but the mirror still refuses: sign-in content, new session kept for the app", r.calls.length === 2 && (r.stored() as { refresh_token?: string }).refresh_token === "r2" && shows(r) === "sign-in", shows(r));

  r = await run(stale, (c) => (c.url === refreshUrl ? { status: 200, body: renewed } : ok), { writable: false });
  check("storage not writable: no refresh at all (the app would lose its token family), try-again", r.calls.length === 0 && shows(r) === "try-again", shows(r));

  r = await run(live, () => ok, { locks: false });
  check("without the Web Locks API the heal still runs", r.calls.length === 1 && r.replaced === retried);
}

async function testSupabaseFetch() {
  console.log("\n--- Supabase fetch: proxy fallback and rate-limited refreshes ---");
  const SUPA = "https://abcdefghijklmnopqrst.supabase.co";
  const tokenUrl = `${SUPA}/auth/v1/token?grant_type=refresh_token`;
  interface Hit { url: string; init?: RequestInit }
  function harness(answer: (url: string, init: RequestInit | undefined, n: number) => Response | "network", browser = true) {
    const calls: Hit[] = []; const proxied: string[] = []; let limited = 0;
    const f = createSupabaseFetch({
      supabaseOrigin: SUPA,
      location: () => (browser ? { origin: "https://app.example", href: "https://app.example/schedule" } : null),
      fetch: async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        calls.push({ url, init });
        const a = answer(url, init, calls.length);
        if (a === "network") throw new TypeError("Failed to fetch");
        return a;
      },
      onProxy: (service) => proxied.push(service),
      onRateLimited: () => { limited++; },
    });
    return { f, calls, proxied, limited: () => limited, urls: () => calls.map((c) => c.url).join(",") };
  }
  const ok = () => new Response("{}", { status: 200 });
  let h = harness(() => ok());
  let res = await h.f(`${SUPA}/auth/v1/otp`, { method: "POST", body: "{}" });
  check("direct request goes out once, as is", res.status === 200 && h.calls.length === 1 && h.calls[0].url === `${SUPA}/auth/v1/otp` && h.calls[0].init?.credentials === undefined, h.urls());

  h = harness((url) => (url.startsWith(SUPA) ? "network" : ok()));
  res = await h.f(`${SUPA}/auth/v1/otp`, { method: "POST", body: "{}" });
  check("auth request that fails on the network is retried through the same-origin proxy, credentials omitted", res.status === 200 && h.calls.length === 2 && h.calls[1].url === "https://app.example/supabase/auth/v1/otp" && h.calls[1].init?.credentials === "omit" && h.calls[1].init?.method === "POST", h.urls());
  check("the switch to the proxy is reported once, with the service", eq(h.proxied, ["auth/v1"]));
  res = await h.f(tokenUrl, { method: "POST", body: "{}" });
  check("once the proxy was needed it goes first", h.calls.length === 3 && h.calls[2].url === "https://app.example/supabase/auth/v1/token?grant_type=refresh_token", h.urls());

  h = harness((_u, _i, n) => (n === 1 || n === 3 ? "network" : ok()));
  await h.f(`${SUPA}/auth/v1/otp`); await h.f(`${SUPA}/auth/v1/otp`);
  check("flips back to direct when the proxy fails and direct answers, without a second report", h.calls.length === 4 && h.calls[2].url.startsWith("https://app.example/supabase/") && h.calls[3].url.startsWith(SUPA) && eq(h.proxied, ["auth/v1"]), h.urls());

  h = harness(() => new Response("{}", { status: 400 }));
  res = await h.f(`${SUPA}/auth/v1/verify`, { method: "POST" });
  check("an HTTP error is a response, not a reason to try the proxy", res.status === 400 && h.calls.length === 1);

  h = harness(() => "network");
  const restErr = await h.f(`${SUPA}/rest/v1/things`).catch((e: unknown) => e);
  check("other Supabase paths fail as before, no proxy", restErr instanceof TypeError && h.calls.length === 1);

  h = harness(() => new Response('{"code":429,"msg":"Rate limit exceeded"}', { status: 429, headers: { "Retry-After": "7" } }));
  res = await h.f(tokenUrl, { method: "POST" });
  check("a rate-limited refresh comes back as 503, which auth-js retries instead of signing out", res.status === 503 && h.calls.length === 1 && (await res.text()).includes("Rate limit") && res.headers.get("Retry-After") === "7" && h.limited() === 1, `status ${res.status}`);

  h = harness(() => new Response("{}", { status: 429 }));
  res = await h.f(`${SUPA}/auth/v1/verify`, { method: "POST" });
  check("a rate-limited code check stays a 429 for the sign-in form", res.status === 429 && h.limited() === 0);

  h = harness((url) => (url.startsWith(SUPA) ? "network" : new Response("{}", { status: 429 })));
  res = await h.f(tokenUrl, { method: "POST" });
  check("the same softening applies to a rate limit met through the proxy", res.status === 503 && h.calls.length === 2 && h.limited() === 1, h.urls());

  h = harness(() => "network", false);
  const serverErr = await h.f(`${SUPA}/auth/v1/otp`).catch((e: unknown) => e);
  check("outside a browser the request goes out once and errors propagate", serverErr instanceof TypeError && h.calls.length === 1);

  h = harness(() => "network");
  const streamErr = await h.f(`${SUPA}/auth/v1/otp`, { method: "POST", body: new ReadableStream() }).catch((e: unknown) => e);
  check("a streamed body is sent once (it cannot be replayed)", streamErr instanceof TypeError && h.calls.length === 1);

  check("isTokenRateLimit: the token endpoint and a 429 only", isTokenRateLimit(new URL(tokenUrl), { status: 429 }) && !isTokenRateLimit(new URL(`${SUPA}/auth/v1/token`), { status: 400 }) && !isTokenRateLimit(new URL(`${SUPA}/auth/v1/verify`), { status: 429 }));
}

function testReturnAfterSignIn() {
  console.log("\n--- return to the page that asked for sign-in ---");
  check("sign-in href carries the session path", signInHref("/schedule/abc-123") === `/my-devcon?${RETURN_PARAM}=%2Fschedule%2Fabc-123`);
  check("sign-in href without a safe target is plain My Devcon", signInHref("https://evil.example") === "/my-devcon");
  check("in-app path accepted", safeReturnPath("/schedule/abc-123") === "/schedule/abc-123");
  check("in-app path with query and hash accepted", safeReturnPath("/schedule/abc?hubs=1#qa") === "/schedule/abc?hubs=1#qa");
  check("protocol-relative rejected", safeReturnPath("//evil.example/x") === null);
  check("backslash variant rejected", safeReturnPath("/\\evil.example/x") === null);
  check("absolute URL rejected", safeReturnPath("https://evil.example/x") === null);
  check("scheme rejected", safeReturnPath("javascript:alert(1)") === null);
  check("relative path rejected", safeReturnPath("schedule/abc") === null);
  check("control characters rejected", safeReturnPath("/schedule/abc\n") === null);
  check("empty and missing rejected", safeReturnPath("") === null && safeReturnPath(null) === null && safeReturnPath(undefined) === null);
  check("My Devcon itself is not a return target (no loop)", safeReturnPath("/my-devcon") === null && safeReturnPath("/my-devcon?next=%2Fx") === null);
}

function testServiceWorkerUpdateFlow() {
  console.log("\n--- service worker update flow ---");
  const SKIP = JSON.stringify({ type: "SKIP_WAITING" });
  type FakeWorker = WaitingWorker & { messages: string[] };
  const worker = (): FakeWorker => {
    const w: FakeWorker = { messages: [], postMessage: (m) => w.messages.push(JSON.stringify(m)) };
    return w;
  };
  const NOW = 1_700_000_000_000;
  const harness = (opts: { waiting?: FakeWorker | null; installing?: boolean; marker?: UpdateMarker | null } = {}) => {
    const calls: string[] = [];
    const states: UpdateState[] = [];
    let timer: { fn: () => void; ms: number } | null = null;
    const st = { waiting: opts.waiting ?? null, installing: opts.installing ?? false, marker: opts.marker ?? null };
    const flow = createUpdateFlow({
      waiting: () => st.waiting,
      installing: () => st.installing,
      pauseWarming: () => calls.push("pause"),
      reload: () => calls.push("reload"),
      readMarker: () => st.marker,
      writeMarker: (m) => {
        st.marker = m;
      },
      setTimeout: (fn, ms) => {
        timer = { fn, ms };
        return 1;
      },
      clearTimeout: () => {
        timer = null;
      },
      now: () => NOW,
      onState: (s) => states.push(s),
    });
    return {
      flow,
      calls,
      states,
      st,
      fire: () => {
        const t = timer;
        timer = null;
        t?.fn();
      },
      armedMs: () => timer?.ms ?? null,
    };
  };

  // The click.
  {
    const w = worker();
    const h = harness({ waiting: w });
    h.flow.updateAvailable();
    check("a waiting worker shows the prompt", h.states.at(-1) === "available");
    h.flow.requestUpdate();
    check("the click pauses the image warmer before asking the worker to take over", h.calls[0] === "pause" && w.messages[0] === SKIP);
    check("the click shows the updating state", h.states.at(-1) === "updating" && h.flow.state === "updating");
    check("the click remembers the request for a reload", h.st.marker?.reloads === 0 && h.st.marker?.at === NOW);
    check("the click arms the takeover timeout", h.armedMs() === TAKEOVER_TIMEOUT_MS);
    const w3 = worker();
    h.flow.workerInstalled(w3);
    check("a newer worker installed after the click is asked to take over too", w3.messages[0] === SKIP && h.flow.state === "updating");
    h.flow.controllerChanged();
    check("the new worker taking control reloads once and forgets the request", h.calls.at(-1) === "reload" && h.st.marker === null && h.armedMs() === null);
  }
  // The worker waiting at click time is the one asked, not the one the prompt saw.
  {
    const w1 = worker();
    const h = harness({ waiting: w1 });
    h.flow.workerInstalled(w1);
    check("a worker finishing its install shows the prompt", h.states.at(-1) === "available");
    const w2 = worker();
    h.st.waiting = w2;
    h.flow.requestUpdate();
    check("the click asks the worker waiting now, not the one the prompt saw", w2.messages[0] === SKIP && w1.messages.length === 0);
  }
  {
    const h = harness();
    h.flow.controllerChanged();
    check("a first install taking control does not reload", !h.calls.includes("reload") && h.flow.state === "idle");
  }
  // Nothing happens in time: reload to help the old worker let go.
  {
    const w = worker();
    const h = harness({ waiting: w });
    h.flow.requestUpdate();
    h.fire();
    check("no takeover in time reloads with the request carried over", h.calls.at(-1) === "reload" && h.st.marker?.reloads === 1);
  }
  // After that reload: resume without a click.
  {
    const w = worker();
    const h = harness({ waiting: w, marker: { at: NOW - 1000, reloads: 1 } });
    h.flow.start();
    check("a carried-over request resumes as updating without a click", h.calls[0] === "pause" && w.messages[0] === SKIP && h.flow.state === "updating");
    h.fire();
    check("the second timeout reloads once more", h.calls.at(-1) === "reload" && h.st.marker?.reloads === 2);
  }
  {
    const w = worker();
    const h = harness({ waiting: w, marker: { at: NOW - 1000, reloads: MAX_FALLBACK_RELOADS } });
    h.flow.start();
    h.fire();
    check("after the last reload the flow waits and says so instead of reloading again", !h.calls.includes("reload") && h.flow.state === "slow");
    h.flow.controllerChanged();
    check("the takeover still reloads from the slow state", h.calls.at(-1) === "reload" && h.st.marker === null);
  }
  {
    const h = harness({ marker: { at: NOW - 1000, reloads: 1 } });
    h.flow.start();
    check("the switch done during the reload reloads once more under the new worker", h.calls.at(-1) === "reload" && h.st.marker === null);
  }
  {
    const h = harness({ marker: { at: NOW - 1000, reloads: MAX_FALLBACK_RELOADS } });
    h.flow.start();
    check("with no reloads left and nothing waiting the request is dropped", !h.calls.includes("reload") && h.st.marker === null && h.flow.state === "idle");
  }
  {
    const w = worker();
    const h = harness({ waiting: w, marker: { at: NOW - MARKER_TTL_MS - 1, reloads: 1 } });
    h.flow.start();
    check("a stale request is ignored and cleared", w.messages.length === 0 && h.st.marker === null && h.flow.state === "idle");
  }
  // Clicks with nothing waiting.
  {
    const h = harness();
    h.flow.requestUpdate();
    check("a click with no worker waiting or installing just reloads", h.calls.at(-1) === "reload" && h.st.marker === null);
  }
  {
    const h = harness({ installing: true });
    h.flow.requestUpdate();
    check("a click while a newer worker installs waits for it", !h.calls.includes("reload") && h.flow.state === "updating" && h.armedMs() === TAKEOVER_TIMEOUT_MS);
    const w = worker();
    h.flow.workerInstalled(w);
    check("and asks it to take over once installed", w.messages[0] === SKIP);
  }
  {
    const w = worker();
    const h = harness({ waiting: w });
    h.flow.requestUpdate();
    h.flow.dispose();
    check("dispose drops the timeout", h.armedMs() === null);
  }
}

function testSessionCard() {
  console.log("\n--- Session card URL carries what the card shows ---");
  const base = {
    id: "opening-ceremony",
    title: "Opening Ceremony",
    type: "Talk",
    track: "Core Protocol",
    start: 1_700_000_000,
    end: 1_700_003_600,
    room: { id: "main", name: "Main Stage" },
    speakers: [{ id: "alice", name: "Alice", avatar: "https://img.example/alice.webp" }],
  };
  const hash = sessionCardHash(base);
  check("hash is a short URL-safe token", /^[a-z0-9]{1,8}$/.test(hash), hash);
  check("hash is deterministic", sessionCardHash({ ...base, speakers: [{ ...base.speakers[0] }] }) === hash);
  check(
    "url: origin, id, hash, then a filename named after the session",
    sessionCardUrl("https://devcon.org", base) === `https://devcon.org/api/social/schedule/opening-ceremony/${hash}/opening-ceremony.jpg`,
    sessionCardUrl("https://devcon.org", base)
  );
  check("url encodes the id in both places", sessionCardUrl("https://devcon.org", { ...base, id: "a b" }).endsWith("/api/social/schedule/a%20b/" + sessionCardHash({ ...base, id: "a b" }) + "/a%20b.jpg"));
  check("a new speaker changes the hash", sessionCardHash({ ...base, speakers: [...base.speakers, { id: "bob", name: "Bob" }] }) !== hash);
  check("a renamed speaker changes the hash", sessionCardHash({ ...base, speakers: [{ ...base.speakers[0], name: "Alicia" }] }) !== hash);
  check("a new avatar changes the hash", sessionCardHash({ ...base, speakers: [{ ...base.speakers[0], avatar: "https://img.example/alice-2.webp" }] }) !== hash);
  check("a new title changes the hash", sessionCardHash({ ...base, title: "Closing Ceremony" }) !== hash);
  check("a new room changes the hash", sessionCardHash({ ...base, room: { id: "b", name: "Stage B" } }) !== hash);
  check("a new slot changes the hash", sessionCardHash({ ...base, start: base.start + 3600, end: base.end + 3600 }) !== hash);
  check("a new type changes the hash", sessionCardHash({ ...base, type: "Workshop" }) !== hash);
  check("no room and no speakers still hash", /^[a-z0-9]{1,8}$/.test(sessionCardHash({ ...base, room: undefined, speakers: [] })));
  check("fields the card does not show leave the hash alone", sessionCardHash({ ...base, description: "longer text", tags: ["x"] } as typeof base) === hash);
}

async function main() {
  testNormalize();
  testReminders();
  testMeerkatHandover();
  testReminderCatalogue();
  testIosVersion();
  testPassBarcode();
  testMaterialize();
  testProgramme();
  testTrackTheme();
  testSyncDecision();
  testRouting();
  testInstallVersion();
  testPrimary();
  testRateLimiter();
  testInterestsMerge();
  testAiPlan();
  testPreviewAccess();
  testServiceWorkerUpdateFlow();
  testReturnAfterSignIn();
  await testSessionCookieSettled();
  testAuthCookieParser();
  await testHealScript();
  await testSupabaseFetch();
  testTeamTestPush();
  await testRetryOnce();
  await testWhenControlled();
  await testMemoryStorage();
  testLegacySessionLink();
  testSessionCard();
  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
}

main();
