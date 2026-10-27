import assert from "node:assert/strict";
import { test } from "node:test";
import { flattenPath, parsePath } from "./path";
import { apply, multiply, parseTransform } from "./transform";
import { decodeEntities, parseXml } from "./xml";
import { isDefaultName, normaliseId, parseName } from "./names";

test("xml: elements, attributes, nesting, entities", () => {
  const root = parseXml('<svg viewBox="0 0 10 10">\n<g id="Colour_Box">\n<path id="tea-&#38;-coffee-7" d="M0 0H1V1Z" fill="#1EB9C1"/>\n</g>\n</svg>');
  assert.equal(root.tag, "svg");
  assert.equal(root.children[0].attrs.id, "Colour_Box");
  assert.equal(root.children[0].children[0].attrs.id, "tea-&-coffee-7");
  assert.equal(decodeEntities("Text__x26__Icon &amp; &#x41;"), "Text__x26__Icon & A");
  assert.throws(() => parseXml("<svg><g></svg>"), /Mismatched/);
});

test("transform: composition and rotate about a point", () => {
  const m = parseTransform("translate(10 5) scale(2)");
  assert.deepEqual(apply(m, 1, 1), [12, 7]);
  const r = parseTransform("rotate(90 1 1)");
  const [x, y] = apply(r, 2, 1);
  assert.ok(Math.abs(x - 1) < 1e-9 && Math.abs(y - 2) < 1e-9);
  assert.deepEqual(multiply([1, 0, 0, 1, 1, 2], [1, 0, 0, 1, 3, 4]), [1, 0, 0, 1, 4, 6]);
  assert.throws(() => parseTransform("perspective(1)"), /Unsupported/);
});

test("path: relative commands, H/V, S/T, implicit lineto, Z", () => {
  const segs = parsePath("m1 1 h2 v2 l-2 0 z");
  assert.deepEqual(
    segs.map((s) => ("to" in s ? s.to : "Z")),
    [[1, 1], [3, 1], [3, 3], [1, 3], "Z"]
  );
  const sub = flattenPath("M0 0 10 0 10 10Z M20 20 L30 20", 0.1);
  assert.equal(sub.length, 2);
  assert.equal(sub[0].closed, true);
  assert.deepEqual(sub[0].points, [[0, 0], [10, 0], [10, 10]]);
  assert.equal(sub[1].closed, false);
  const smooth = parsePath("M0 0 C1 1 2 1 3 0 S5 -1 6 0");
  assert.deepEqual((smooth[2] as { c1: [number, number] }).c1, [4, -1]);
});

test("path: curves flatten within tolerance, arcs become points on the circle", () => {
  const sub = flattenPath("M0 0 C0 10 10 10 10 0", 0.05);
  assert.ok(sub[0].points.length > 8);
  assert.deepEqual(sub[0].points[sub[0].points.length - 1], [10, 0]);
  const arc = flattenPath("M0 0 A5 5 0 0 1 10 0", 0.05);
  for (const [x, y] of arc[0].points) assert.ok(Math.abs(Math.hypot(x - 5, y) - 5) < 0.06, `point (${x}, ${y}) off the circle`);
  assert.ok(arc[0].points.some(([, y]) => y < -4.9), "arc sweeps through the top of the circle");
});

test("names: normalisation, instance numbers, Figma defaults", () => {
  assert.deepEqual(parseName("tea-&-coffee-7"), { id: "tea-coffee-7", areaId: "tea-coffee", instance: 7 });
  assert.deepEqual(parseName("wall_3"), { id: "wall-3", areaId: "wall", instance: 3 });
  assert.deepEqual(parseName("music-stage"), { id: "music-stage", areaId: "music-stage", instance: null });
  assert.equal(normaliseId("Colour_Box"), "colour-box");
  assert.equal(normaliseId("Text__x26__Icon"), "text-x26-icon");
  assert.ok(isDefaultName("Vector_12") && isDefaultName("Group") && isDefaultName(null));
  assert.ok(!isDefaultName("escalator_2"));
});
