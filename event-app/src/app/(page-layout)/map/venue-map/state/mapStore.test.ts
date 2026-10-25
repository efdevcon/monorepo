import assert from "node:assert/strict";
import { test } from "node:test";
import { initialState, LANDING_FLOOR, reduce, SINGLE_FLOOR, violations, type MapAction, type MapState } from "./mapStore";
import { LEVELS } from "../data/levels";

const L = LEVELS[0].id;
const key = (id: string) => `${L}/${id}`;

function run(actions: MapAction[], from: MapState = initialState): MapState {
  let s = from;
  for (const a of actions) {
    s = reduce(s, a);
    assert.deepEqual(violations(s), [], `after ${a.type}`);
  }
  return s;
}

test("landing: a single floor is open, several are stacked", () => {
  assert.equal(initialState.floor, LANDING_FLOOR);
  assert.equal(SINGLE_FLOOR, LEVELS.length === 1);
  assert.deepEqual(violations(initialState), []);
});

test("select only lands on the open floor; a floor change clears it", () => {
  let s = run([{ type: "openFloor", level: L }, { type: "select", key: key("a") }]);
  assert.equal(s.selected, key("a"));
  s = run([{ type: "select", key: "ZZ/a" }], s);
  assert.equal(s.selected, key("a"), "a key off the floor is ignored");
  s = run([{ type: "toggleFloor", level: L }], s);
  if (!SINGLE_FLOOR) assert.equal(s.floor, null);
  s = run([{ type: "openFloor", level: L }, { type: "select", key: key("a") }, { type: "showStack" }], s);
  assert.equal(s.selected, SINGLE_FLOOR ? key("a") : null);
});

test("showAreas opens the floor, selects the primary, groups the rest and bumps the focus", () => {
  let s = run([{ type: "showAreas", keys: [key("a"), key("b")], primary: key("b"), zoom: 2, name: "Both" }]);
  assert.equal(s.floor, L);
  assert.equal(s.groupName, "Both");
  assert.equal(s.selected, key("b"));
  assert.deepEqual(s.group, [key("a"), key("b")]);
  assert.equal(s.focus?.seq, 1);
  s = run([{ type: "showAreas", keys: [key("a")], primary: key("a"), zoom: 2, name: "Both" }], s);
  assert.equal(s.group, null);
  assert.equal(s.groupName, null, "a single footprint never carries a group name");
  assert.equal(s.focus?.seq, 2, "a repeat pick re-focuses");
  assert.equal(reduce(s, { type: "showAreas", keys: [key("a"), "ZZ/b"], primary: key("a"), zoom: 1 }), s, "mixed floors are rejected");
  s = run([{ type: "select", key: null }], s);
  assert.equal(s.group, null);
  assert.equal(s.focus, null);
});

test("panels: one at a time, the query lives only in Search, picks close them", () => {
  let s = run([{ type: "openPanel", panel: "find" }, { type: "setQuery", query: "tea" }]);
  assert.equal(s.query, "", "Find has no query");
  s = run([{ type: "openPanel", panel: "search" }, { type: "setQuery", query: "tea" }], s);
  assert.equal(s.panel, "search");
  assert.equal(s.query, "tea");
  s = run([{ type: "openPanel", panel: "find" }], s);
  assert.equal(s.query, "");
  s = run([{ type: "openPanel", panel: "search" }, { type: "setQuery", query: "x" }, { type: "showAreas", keys: [key("a")], primary: key("a"), zoom: 2 }], s);
  assert.equal(s.panel, null);
  assert.equal(s.query, "");
});

test("reset returns to the landing floor, clears everything and bumps resetSeq", () => {
  const s = run([{ type: "openFloor", level: L }, { type: "select", key: key("a") }, { type: "openPanel", panel: "find" }, { type: "reset" }]);
  assert.equal(s.floor, LANDING_FLOOR);
  assert.equal(s.selected, null);
  assert.equal(s.panel, null);
  assert.equal(s.resetSeq, 1);
});
