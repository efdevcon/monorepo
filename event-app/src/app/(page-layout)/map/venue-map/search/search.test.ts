import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFindGroups, buildFloorLegend, primaryOf } from "../find/catalogue";
import { LEVELS } from "../data/levels";
import { AREA_LIST } from "../data/resolve";
import { parseFloorQuery, searchFind } from "./search";

const L = LEVELS[0];
/** The exhibition floor: the stages, hubs and supporters the assertions below name. */
const L3 = "L3" as const;
const groups = buildFindGroups();

test("floor parsing: aliases, scoped text, bare digits stay names", () => {
  assert.deepEqual(parseFloorQuery(`level ${L.id.slice(1)}`), { level: L.id, rest: "" });
  assert.deepEqual(parseFloorQuery(`washroom ${L.id.toLowerCase()}`), { level: L.id, rest: "washroom" });
  assert.deepEqual(parseFloorQuery("hub 1"), { level: null, rest: "hub 1" });
});

test("search: name and category matches, duplicates collapsed with their count", () => {
  const { hits } = searchFind(groups, "coffee");
  assert.equal(hits.length, 3, "the tea & coffee footprints are one row per floor (L1, L2, L3)");
  assert.equal(hits.find((h) => h.level === L3)?.areas.length, 5, "five on Level 3");
  assert.deepEqual(hits.map((h) => h.level), ["L1", "L2", "L3"], "same name sorts by floor");
  assert.equal(searchFind(groups, "coffee l1").hits.length, 1, "a floor in the query scopes it");
  const washrooms = searchFind(groups, "washrooms").hits;
  assert.ok(washrooms.some((h) => h.name === "Washroom"), "category label matches");
  const floor = searchFind(groups, `level ${L.id.slice(1)}`);
  assert.equal(floor.floor?.level, L.id);
  assert.equal(floor.hits.length, floor.floor?.count);
  assert.deepEqual(searchFind(groups, "   "), { floor: null, hits: [] });
});

test("catalogue: every area is listed once, numbered names carry their number", () => {
  const listed = groups.flatMap((g) => g.floors.flatMap((f) => f.entries.filter((e) => !e.key.includes("composite:")).flatMap((e) => e.areas)));
  assert.equal(listed.length, AREA_LIST.length);
  const stageFloors = groups.find((g) => g.category.id === "stages")!.floors;
  assert.deepEqual(
    stageFloors.map((f) => f.level),
    ["L0", "L2", "L3"],
    "stages are listed floor by floor, lowest first"
  );
  const stages = stageFloors.find((f) => f.level === L3)!.entries.map((e) => e.name);
  assert.deepEqual(stages, ["Main Stage", "Lotus Stage 1", "Lotus Stage 2", "Lotus Stage 3", "Jasmine Stage 4", "Music Stage"]);
  assert.deepEqual(stageFloors.find((f) => f.level === "L0")!.entries.map((e) => e.name), ["Community Led Stage"]);
  const main = stageFloors.find((f) => f.level === L3)!.entries[0];
  assert.equal(main.areas.length, 3, "the Main Stage row highlights the three Lotus halls");
  const hubFloors = groups.find((g) => g.category.id === "hubs")!.floors;
  assert.deepEqual(hubFloors.find((f) => f.level === "L0")!.entries.map((e) => e.name), ["CLS Hangout Area"]);
  assert.deepEqual(hubFloors.find((f) => f.level === "L2")!.entries.map((e) => e.name), ["Workshop 1", "Workshop 2"], "the workshops are community places");
  const suites = groups.find((g) => g.category.id === "suites")!.floors;
  assert.deepEqual(suites.map((f) => [f.level, f.entries.length]), [["L1", 6], ["L2", 8]]);
  assert.ok(suites[0].entries.some((e) => e.name === "Frontier Suite 102"), "a numbered suite layer carries its room number");
  assert.ok(suites[0].entries.some((e) => e.name === "Tangerine Whistle Suite 105a"));
  assert.ok(AREA_LIST.some((a) => a.key === "L2/lightning-stage" && a.roomIds.includes("lightning-stage")), "the Lightning Stage maps to its Pretalx room");
  assert.ok(AREA_LIST.some((a) => a.key === "L0/cls-stage" && a.roomIds.includes("community-led-stage")));
  assert.ok(AREA_LIST.filter((a) => a.areaId === "escalator").every((a) => a.shape.hidden), "unnamed escalator symbols on the lower floors are sprite-only places too");
  assert.equal(AREA_LIST.filter((a) => a.areaId === "escalator").length, 9, "two on each floor, three on Level 2");
  assert.equal(AREA_LIST.find((a) => a.key === "L0/elevator-2")?.icon, "elevator-left", "east elevators face the other way");
  assert.equal(AREA_LIST.find((a) => a.key === "L0/elevator-1")?.icon, "elevator-right");
  const hub7 = AREA_LIST.find((a) => a.areaId === "community-hub" && a.instance === 7);
  assert.equal(hub7?.name, "Privacy Hub", "a booth with a hub takes the hub's name");
  assert.equal(hub7?.boothName, "Hub 7");
  assert.ok(hub7?.iconUrl?.includes("/community-hubs/logos/privacy.svg"), "the hub's mark is the sprite");
  assert.ok(hub7?.roomIds.includes("community-hub-privacy"));
  assert.ok(AREA_LIST.some((a) => a.areaId === "escalator" && a.shape.hidden), "escalators are sprite-only places");
  const f1 = AREA_LIST.find((a) => a.areaId === "flagship-supporter" && a.instance === 1);
  assert.equal(f1?.name, "Fluid");
  assert.equal(f1?.boothName, "Flagship Supporter F1");
  assert.equal(f1?.iconBackdrop, "#ff66aa", "a white logo gets the booth colour behind it");
  const s4 = AREA_LIST.find((a) => a.areaId === "starter" && a.instance === 4);
  assert.equal(s4?.name, "Bitget", "every supporter booth has a tenant since 2026-10-25");
  assert.equal(s4?.boothName, "Starter Supporter S4", "the plan name stays as the booth line");
  assert.ok(AREA_LIST.filter((a) => a.category.id === "supporters").every((a) => a.boothName && !a.name.includes(" / ")), "shared booths name one supporter only");
  assert.equal(AREA_LIST.find((a) => a.areaId === "washroom")?.name, "Washroom");
  const hubs = AREA_LIST.filter((a) => a.areaId === "community-hub");
  assert.ok(hubs.map((a) => a.key).includes(primaryOf(hubs)));
});

test("floor legend: one swatch chip per category that asks for one", () => {
  const legend = buildFloorLegend(L3);
  assert.ok(legend.some((e) => e.label === "Stages" && e.swatch === "#0088ee"));
  assert.ok(legend.every((e) => e.areas.length > 0 && e.swatch));
  const community = legend.find((e) => e.label === "Community")!;
  assert.ok(community.areas.some((a) => a.areaId === "blue-discussion-corner"), "the yellow discussion corners sit under Community");
  assert.ok(community.areas.some((a) => a.areaId === "open-hardware-zone"));
  assert.ok(legend.find((e) => e.label === "Work & Rest")!.areas.some((a) => a.areaId === "decompression-zone"));
  assert.ok(!legend.find((e) => e.label === "Fun & Culture")!.areas.some((a) => a.areaId === "decompression-zone"));
  assert.ok(legend.find((e) => e.label === "Fun & Culture")!.areas.some((a) => a.areaId === "swag-station"), "the Swag Station sits with the places of its colour");
  assert.ok(buildFloorLegend("L0").find((e) => e.label === "Stages")!.areas.some((a) => a.areaId === "cls-hangout-area"), "the CLS Hangout Area is blue like the stages");
  assert.ok(!legend.some((e) => e.label === "Check-in"), "so Level 3 has no Check-in chip");
  assert.deepEqual(buildFloorLegend("L0").map((e) => [e.label, e.swatch]), [["Stages", "#0088ee"], ["Check-in", "#128242"], ["Fun & Culture", "#aa99dd"]]);
  assert.deepEqual(buildFloorLegend("L1").map((e) => e.label), ["Suites"]);
  assert.deepEqual(buildFloorLegend("L2").map((e) => [e.label, e.swatch]), [["Stages", "#0088ee"], ["Suites", "#90ec65"], ["Community", "#edb529"]]);
});
