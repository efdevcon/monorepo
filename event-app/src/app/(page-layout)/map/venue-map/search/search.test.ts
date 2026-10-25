import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFindGroups, buildFloorLegend, primaryOf } from "../find/catalogue";
import { LEVELS } from "../data/levels";
import { AREA_LIST } from "../data/resolve";
import { parseFloorQuery, searchFind } from "./search";

const L = LEVELS[0];
const groups = buildFindGroups();

test("floor parsing: aliases, scoped text, bare digits stay names", () => {
  assert.deepEqual(parseFloorQuery(`level ${L.id.slice(1)}`), { level: L.id, rest: "" });
  assert.deepEqual(parseFloorQuery(`washroom ${L.id.toLowerCase()}`), { level: L.id, rest: "washroom" });
  assert.deepEqual(parseFloorQuery("hub 1"), { level: null, rest: "hub 1" });
});

test("search: name and category matches, duplicates collapsed with their count", () => {
  const { hits } = searchFind(groups, "tea");
  assert.equal(hits.length, 1, "five tea & coffee footprints are one row");
  assert.equal(hits[0].areas.length, 5);
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
  const stages = groups.find((g) => g.category.id === "stages")!.floors[0].entries.map((e) => e.name);
  assert.deepEqual(stages, ["Main Stage", "Lotus Stage 1", "Lotus Stage 2", "Lotus Stage 3", "Jasmine Stage 4", "Music Stage"]);
  const main = groups.find((g) => g.category.id === "stages")!.floors[0].entries[0];
  assert.equal(main.areas.length, 3, "the Main Stage row highlights the three Lotus halls");
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
  assert.equal(AREA_LIST.find((a) => a.areaId === "starter" && a.instance === 4)?.name, "Starter Supporter S4", "a booth without a tenant keeps the plan name");
  assert.equal(AREA_LIST.find((a) => a.areaId === "washroom")?.name, "Washroom");
  const hubs = AREA_LIST.filter((a) => a.areaId === "community-hub");
  assert.ok(hubs.map((a) => a.key).includes(primaryOf(hubs)));
});

test("floor legend: one swatch chip per category that asks for one", () => {
  const legend = buildFloorLegend(L.id);
  assert.ok(legend.some((e) => e.label === "Stages" && e.swatch === "#0088ee"));
  assert.ok(legend.every((e) => e.areas.length > 0 && e.swatch));
});
