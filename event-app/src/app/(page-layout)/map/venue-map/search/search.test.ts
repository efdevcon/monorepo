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
  const listed = groups.flatMap((g) => g.floors.flatMap((f) => f.entries.flatMap((e) => e.areas)));
  assert.equal(listed.length, AREA_LIST.length);
  const hub7 = AREA_LIST.find((a) => a.areaId === "community-hub" && a.instance === 7);
  assert.equal(hub7?.name, "Hub 7");
  assert.equal(AREA_LIST.find((a) => a.areaId === "washroom")?.name, "Washroom");
  const hubs = AREA_LIST.filter((a) => a.areaId === "community-hub");
  assert.ok(hubs.map((a) => a.key).includes(primaryOf(hubs)));
});

test("floor legend: one swatch chip per category that asks for one", () => {
  const legend = buildFloorLegend(L.id);
  assert.ok(legend.some((e) => e.label === "Stages" && e.swatch === "#0088ee"));
  assert.ok(legend.every((e) => e.areas.length > 0 && e.swatch));
});
