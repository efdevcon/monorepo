import assert from "node:assert/strict";
import { test } from "node:test";
import { area, bbox, cutPolyline, notchHoles, pointInRing, polylabel, ringsToPolygons, signedArea, simplify, strokeToPolygons, widen, type Ring } from "./geometry";

const square = (x: number, y: number, s: number): Ring => [
  [x, y],
  [x + s, y],
  [x + s, y + s],
  [x, y + s],
];

test("rings: even-odd nesting gives outers and holes, oriented", () => {
  const polys = ringsToPolygons([square(0, 0, 10), square(2, 2, 4), square(3, 3, 1), square(20, 0, 2)]);
  assert.equal(polys.length, 3);
  const big = polys.find((p) => area(p.outer) === 100)!;
  assert.equal(big.holes.length, 1);
  assert.equal(area(big.holes[0]), 16);
  assert.ok(signedArea(big.outer) > 0 && signedArea(big.holes[0]) < 0);
  const inner = polys.find((p) => area(p.outer) === 1)!;
  assert.equal(inner.holes.length, 0);
});

test("notch: a hole drawn to the outer edge opens onto it, an inner hole stays", () => {
  // A void 0.3 short of the bottom edge (y = 10) and a real hole in the middle.
  const [slab] = ringsToPolygons([square(0, 0, 10), [[3, 9.7], [3, 5], [7, 5], [7, 9.7]], square(1, 1, 1)]);
  assert.equal(slab.holes.length, 2);
  const { polygon, notched } = notchHoles(slab, 1);
  assert.equal(notched.length, 1);
  assert.equal(polygon.holes.length, 1);
  assert.equal(area(polygon.holes[0]), 1);
  assert.equal(Math.round(area(polygon.outer) * 1000) / 1000, 80);
  assert.ok(!pointInRing([5, 8], polygon.outer));
  assert.ok(pointInRing([5, 2], polygon.outer));
  // The contacts land on the edge itself: no sliver left.
  assert.ok(polygon.outer.some(([x, y]) => x === 3 && y === 10) && polygon.outer.some(([x, y]) => x === 7 && y === 10));
  // A hole touching the edge in two places is a bridge, left alone.
  const [bridge] = ringsToPolygons([square(0, 0, 10), [[1, 9.9], [1, 5], [9, 5], [9, 9.9], [8, 9.9], [8, 6], [2, 6], [2, 9.9]]]);
  assert.equal(notchHoles(bridge, 1).notched.length, 0);
});

test("simplify: drops collinear points, keeps corners", () => {
  const ring: Ring = [[0, 0], [5, 0.01], [10, 0], [10, 10], [0, 10]];
  assert.deepEqual(simplify(ring, 0.1), [[0, 0], [10, 0], [10, 10], [0, 10]]);
  assert.equal(simplify(ring, 0.001).length, 5);
});

test("polylabel: an L-shape anchors in its wide arm, not the centroid", () => {
  const L: Ring = [[0, 0], [10, 0], [10, 2], [2, 2], [2, 10], [0, 10]];
  const [x, y] = polylabel({ outer: L, holes: [] }, 0.05);
  assert.ok(pointInRing([x, y], L), "inside");
  assert.ok((y <= 2.1 && x > 1) || (x <= 2.1 && y > 1), `on an arm, got ${x}, ${y}`);
});

test("stroke: an open line becomes a rectangle of the stroke width", () => {
  const [poly] = strokeToPolygons([[0, 0], [10, 0]], false, 2);
  assert.equal(poly.holes.length, 0);
  assert.ok(Math.abs(area(poly.outer) - 20) < 1e-9);
  const [corner] = strokeToPolygons([[0, 0], [10, 0], [10, 10]], false, 2);
  assert.ok(Math.abs(area(corner.outer) - 40) < 1e-9, `mitred L area ${area(corner.outer)}`);
});

test("stroke: a closed loop becomes a ring with a hole", () => {
  const [poly] = strokeToPolygons(square(0, 0, 10), true, 2);
  assert.equal(poly.holes.length, 1);
  assert.ok(Math.abs(area(poly.outer) - 144) < 1e-9);
  assert.ok(Math.abs(area(poly.holes[0]) - 64) < 1e-9);
});

test("cut: door boxes split a wall into runs, closed loops open up", () => {
  const runs = cutPolyline([[0, 0], [10, 0]], false, [[4, -1, 6, 1]]);
  assert.deepEqual(runs.map((r) => r.points), [[[0, 0], [4, 0]], [[6, 0], [10, 0]]]);
  const loop = cutPolyline(square(0, 0, 10), true, [[4, -1, 6, 1]]);
  assert.equal(loop.length, 1);
  assert.equal(loop[0].closed, false);
  assert.deepEqual(loop[0].points[0], [6, 0]);
  assert.deepEqual(loop[0].points[loop[0].points.length - 1], [4, 0]);
  assert.deepEqual(cutPolyline([[0, 0], [10, 0]], false, [[20, -1, 30, 1]]), [{ points: [[0, 0], [10, 0]], closed: false }]);
});

test("widen: a thin strip grows along its short axis about its centre, wide shapes are untouched", () => {
  const strip: Ring = [[10, 0], [11, 0], [11, 20], [10, 20]];
  const [w] = widen([strip], 4);
  assert.deepEqual(bbox([w]), [8.5, 0, 12.5, 20]);
  assert.deepEqual(widen([square(0, 0, 10)], 4), [square(0, 0, 10)]);
  const flat: Ring = [[0, 5], [20, 5], [20, 6], [0, 6]];
  assert.deepEqual(bbox(widen([flat], 3)), [0, 4, 20, 7]);
});
