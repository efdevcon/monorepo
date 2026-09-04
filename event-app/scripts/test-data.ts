// Pure-function tests for the EventStore and routing modules.
// Run: pnpm data:test

import { normalizeBundle, compact } from "../src/data/store/normalize";
import { materialize, emptySnapshot } from "../src/data/store/materialize";
import { shouldFetch, isBundleShaped } from "../src/data/store/event-store";
import type { EventBundle } from "../src/data/store/types";
import {
  detailHref,
  shareHref,
  legacyDetailRedirect,
  stripIgnoredParams,
} from "../src/routing/viewParams";

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
  check("detailHref session", detailHref("session", "a b") === "/schedule?session=a%20b");
  check("detailHref speaker", detailHref("speaker", "bob") === "/speakers?speaker=bob");
  check("shareHref is the pretty path", shareHref("session", "my-talk") === "/schedule/my-talk" && shareHref("speaker", "bob") === "/speakers/bob");

  const stripped = stripIgnoredParams(new URL(`${origin}/speakers?speaker=x&dataset=devcon-7&mockNow=1&_rsc=abc&utm_source=t`));
  check("stripIgnoredParams keeps only unknown params", stripped.search === "?_rsc=abc", stripped.search);
  const input = new URL(`${origin}/a?session=1`);
  stripIgnoredParams(input);
  check("stripIgnoredParams does not mutate input", input.search === "?session=1");

  const r1 = legacyDetailRedirect(new URL(`${origin}/schedule/my-talk`));
  check("legacy session route redirects", r1?.pathname === "/schedule" && r1?.searchParams.get("session") === "my-talk");
  const r2 = legacyDetailRedirect(new URL(`${origin}/speakers/alice/?dataset=devcon-7`));
  check("legacy speaker route keeps query", r2?.pathname === "/speakers" && r2?.searchParams.get("speaker") === "alice" && r2?.searchParams.get("dataset") === "devcon-7");
  check("static files under /schedule are not redirected", legacyDetailRedirect(new URL(`${origin}/schedule/devcon8-logo.svg`)) === null);
  check("nested static paths are not redirected", legacyDetailRedirect(new URL(`${origin}/schedule/gems/security.webp`)) === null);
  check("shell routes are not redirected", legacyDetailRedirect(new URL(`${origin}/schedule`)) === null && legacyDetailRedirect(new URL(`${origin}/speakers/`)) === null);
  check("other routes are not redirected", legacyDetailRedirect(new URL(`${origin}/room-screens/stage-1`)) === null);
}

async function main() {
  testNormalize();
  testMaterialize();
  testSyncDecision();
  testRouting();
  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
}

main();
