import assert from "node:assert/strict";
import { test } from "node:test";
import { LEVELS } from "../data/levels";
import { planFloorTransition, restY, STACK_GAP_SCALE, stackSpan, stackY } from "./placement";

const ids = LEVELS.map((l) => l.id);

test("stack rests around zero, an open floor sits at zero with the others parked on their side", () => {
  const ys = ids.map((id) => stackY(id, 10));
  assert.ok(Math.abs(ys[0] + ys[ys.length - 1]) < 1e-9, "the stack is centred on its middle");
  assert.ok(ys.every((y, i) => i === 0 || y > ys[i - 1]), "floors rise in order");
  const scales = ids.slice(1).map((id) => STACK_GAP_SCALE[id] ?? 1);
  assert.equal(stackSpan(10), 10 * scales.reduce((a, b) => a + b, 0));
  for (let i = 1; i < ids.length; i++) assert.ok(Math.abs(ys[i] - ys[i - 1] - 10 * scales[i - 1]) < 1e-9, `gap below ${ids[i]} is scaled`);
  const shown = ids[0];
  assert.equal(restY(shown, shown, 10, 500), 0);
  for (const id of ids.slice(1)) assert.equal(restY(id, shown, 10, 500), 500);
});

test("opening a floor from the stack moves every floor; the others hide at the end", () => {
  const poses = new Map(ids.map((id) => [id, { y: stackY(id, 10), visible: true }]));
  const { moves, snaps } = planFloorTransition(poses, null, ids[0], 10, 500);
  assert.equal(moves.length, ids.length);
  assert.equal(snaps.size, 0);
  assert.ok(moves.every((m) => m.hideAtEnd === (m.level !== ids[0])));
  assert.equal(moves.find((m) => m.level === ids[0])!.toY, 0);
});

test("floor to floor: the entering floor comes in from its own side, hidden floors snap", () => {
  if (ids.length < 2) return;
  const [a, b] = ids;
  const poses = new Map(ids.map((id) => [id, { y: id === a ? 0 : 500, visible: id === a }]));
  const { moves, snaps } = planFloorTransition(poses, a, b, 10, 500);
  const enter = moves.find((m) => m.level === b)!;
  assert.equal(enter.fromY, 500, "b enters from above a");
  assert.equal(enter.toY, 0);
  const leave = moves.find((m) => m.level === a)!;
  assert.equal(leave.toY, -500, "a leaves downwards");
  assert.equal(snaps.size, ids.length - 2);
});
