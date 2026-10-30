import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFindGroups, buildFloorLegend, primaryOf } from "../find/catalogue";
import { LEVELS } from "../data/levels";
import { AREA_LIST } from "../data/resolve";
import { SEARCH_TERMS } from "../data/searchTerms";
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
  assert.equal(hits.length, 4, "the tea & coffee footprints are one row per floor (L1, L2, L3), plus the CoW Swap stand's own row");
  assert.equal(hits.find((h) => h.level === L3 && h.name === "Tea & Coffee")?.areas.length, 4, "four unnamed stands on Level 3");
  const cow = hits.find((h) => h.name === "CoW Swap Tea & Coffee")!;
  assert.ok(cow && cow.areas.length === 1 && cow.iconBackdrop && cow.iconUrl?.endsWith("/cow-swap.svg"), "the hosted stand is one row with the host's logo on a chip");
  assert.equal(hits.filter((h) => h.key === cow.key).length, 1, "listed under Food & drink and Supporters, but one hit");
  assert.deepEqual(hits.map((h) => h.level), ["L3", "L1", "L2", "L3"], "same name sorts by floor");
  assert.equal(searchFind(groups, "coffee l1").hits.length, 1, "a floor in the query scopes it");
  const washrooms = searchFind(groups, "washrooms").hits;
  assert.ok(washrooms.some((h) => h.name === "Washroom"), "category label matches");
  const floor = searchFind(groups, `level ${L.id.slice(1)}`);
  assert.equal(floor.floor?.level, L.id);
  assert.equal(floor.hits.length, floor.floor?.count);
  assert.deepEqual(searchFind(groups, "   "), { floor: null, hits: [] });
});

test("search: custom terms bring up their categories and areas", () => {
  const suites = searchFind(groups, "meeting room").hits;
  assert.ok(suites.length > 0 && suites.every((h) => h.category.id === "suites"), "meeting room → the suites only");
  assert.equal(searchFind(groups, "mee").hits.length, suites.length, "a prefix of three letters matches");
  assert.ok(searchFind(groups, "lu").hits.every((h) => h.category.id !== "food" || h.name.toLowerCase().includes("lu")), "two letters stay a name search");
  assert.equal(searchFind(groups, "lun").hits.length, searchFind(groups, "lunch").hits.length, "a prefix of three letters matches");
  const food = searchFind(groups, "lunch").hits;
  assert.ok(food.length > 0 && food.every((h) => h.category.id === "food"), "lunch → food & drink");
  const ways = searchFind(groups, "where is the exit").hits;
  assert.ok(ways.length > 0 && ways.every((h) => h.areas.every((a) => a.areaId === "escalator" || a.areaId === "stairs")), "a whole word inside the query matches");
  assert.equal(searchFind(groups, "exit l3").hits.length, 2, "escalators and stairs on Level 3, one row each");
  assert.ok(searchFind(groups, "toilet").hits.every((h) => h.category.id === "toilets"), "toilet → washrooms");
  assert.ok(searchFind(groups, "lift").hits.every((h) => h.areas.every((a) => a.areaId === "elevator")), "lift → elevators");
  assert.ok(searchFind(groups, "main stage").hits.some((h) => h.key.includes("composite:")), "main stage keeps the Main Stage row");
});

test("search terms: every target exists in the catalogue (a typo would match nothing)", () => {
  const categories = new Set(groups.map((g) => g.category.id));
  const areaIds = new Set(AREA_LIST.map((a) => a.areaId));
  for (const row of SEARCH_TERMS) {
    for (const c of row.categories ?? []) assert.ok(categories.has(c), `category ${c}`);
    for (const a of row.areas ?? []) assert.ok(areaIds.has(a), `area ${a}`);
    for (const term of row.terms) assert.equal(term, term.toLowerCase().trim(), `term "${term}" is lower-case and trimmed`);
  }
});

test("catalogue: every area is listed once, numbered names carry their number", () => {
  const listed = groups.flatMap((g) => g.floors.flatMap((f) => f.entries.filter((e) => !e.key.includes("composite:")).flatMap((e) => e.areas)));
  assert.equal(new Set(listed).size, AREA_LIST.length);
  assert.equal(listed.length, AREA_LIST.length + 1, "the CoW Swap stand is listed twice: Food & drink and Supporters");
  assert.ok(groups.find((g) => g.category.id === "supporters")!.floors.some((f) => f.entries.some((e) => e.name === "CoW Swap Tea & Coffee")));
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
  assert.ok(suites[0].entries.some((e) => e.name === "Frontier - Suite 102"), "a numbered suite layer carries its room number");
  assert.ok(suites[0].entries.some((e) => e.name === "Tangerine Whistle - Suite 105A"));
  assert.ok(AREA_LIST.some((a) => a.key === "L2/lightning-stage" && a.roomIds.includes("lightning-stage")), "the Lightning Stage maps to its Pretalx room");
  assert.ok(AREA_LIST.some((a) => a.key === "L0/cls-stage" && a.roomIds.includes("community-led-stage")));
  assert.ok(AREA_LIST.some((a) => a.key === "L0/cls-hangout-area" && a.roomIds.includes("cls-builders-room")), "the Builders Room sessions show the hangout area for now");
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

test("floor legend: Level 3 keeps the Community and Supporters swatches and lists the rest by icon", () => {
  const legend = buildFloorLegend(L3);
  assert.deepEqual(
    legend.map((e) => e.label),
    ["Lotus Stages", "Jasmine Stage", "Music Stage", "Community", "Supporters", "Swag Station", "Game Zone", "Decompression Zone"]
  );
  assert.ok(legend.every((e) => e.areas.length > 0));
  assert.equal(legend[0].areas.length, 3, "one chip for the three Lotus halls");
  const community = legend.find((e) => e.label === "Community")!;
  assert.equal(community.swatch, "#edb529", "a swatch, not the first hub's logo");
  assert.equal(community.iconUrl, null);
  assert.ok(community.areas.some((a) => a.areaId === "blue-discussion-corner"), "the yellow discussion corners sit under Community");
  assert.ok(community.areas.some((a) => a.areaId === "open-hardware-zone"));
  assert.equal(community.areas.filter((a) => a.areaId === "community-hub").length, 14);
  const supporters = legend.find((e) => e.label === "Supporters")!;
  assert.equal(supporters.areas.length, 27, "flagship, core and starter booths");
  assert.ok(supporters.swatch && !supporters.iconUrl);
  assert.ok(legend.find((e) => e.label === "Game Zone")!.iconUrl?.endsWith("/game-zone.png"));
  assert.ok(!legend.some((e) => e.label === "Check-in"), "so Level 3 has no Check-in chip");
});

test("floor legend: Levels 0–2 list their place types with the theme icon, in spec order", () => {
  const l0 = buildFloorLegend("L0");
  assert.deepEqual(
    l0.map((e) => e.label),
    ["Community Led Stage", "CLS Hangout Area", "Registration", "Badge Pickup", "Ticket Help Desk", "Info Desk", "Cloak Room", "Food Garden", "Poster Printing Station", "Poster Display"]
  );
  assert.ok(l0.every((e) => e.iconUrl || e.swatch), "a chip has an icon or a swatch");
  assert.equal(l0.find((e) => e.label === "CLS Hangout Area")?.swatch, "#0088ee", "no icon yet: a swatch in the footprint's fill");
  assert.equal(l0.find((e) => e.label === "Badge Pickup")?.areas.length, 2, "both pickup desks under one chip");
  assert.ok(!l0.some((e) => e.label.startsWith("Washroom") || e.label.startsWith("Elevator")), "wayfinding and washrooms stay out");
  assert.deepEqual(buildFloorLegend("L1").map((e) => [e.label, e.areas.length]), [["Meeting rooms", 6], ["Speakers Lounge", 1], ["Interview Room", 1]]);
  assert.ok(buildFloorLegend("L1")[0].iconUrl?.endsWith("/suites.png"), "a category chip takes the first member's icon");
  assert.deepEqual(buildFloorLegend("L2").map((e) => [e.label, e.areas.length]), [["Lightning Stage", 1], ["Workshops", 2], ["Meeting rooms", 8], ["Baby Care Room", 1]]);
});
