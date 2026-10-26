import assert from "node:assert/strict";
import { test } from "node:test";
import { registerFrames } from "./register";

test("register: a floor drawn at 1.5× lands its marks on the reference floor's", () => {
  const frames = registerFrames(
    {
      L3: { marks: [[100, 1500], [4300, 1500]], metaScale: null },
      L1: { marks: [[150, 200], [6450, 200]], metaScale: null },
    },
    "L3",
    0.05
  );
  assert.deepEqual(frames.L3.frame, { metresPerPx: 0.05, offset: [0, 0] });
  const { metresPerPx, offset } = frames.L1.frame;
  assert.ok(Math.abs(metresPerPx - 0.05 / 1.5) < 1e-9);
  // Both midpoints map to the same world point.
  const refMid = [(100 + 4300) / 2 * 0.05, 1500 * 0.05];
  const ownMid = [((150 + 6450) / 2) * metresPerPx + offset[0], 200 * metresPerPx + offset[1]];
  assert.ok(Math.abs(refMid[0] - ownMid[0]) < 1e-9 && Math.abs(refMid[1] - ownMid[1]) < 1e-9);
  assert.equal(frames.L1.warning, null);
});

test("register: a meta scale wins over the marks' scale; too few marks keeps the fallback with a warning", () => {
  const frames = registerFrames(
    {
      L3: { marks: [[0, 0], [4000, 0]], metaScale: 0.04 },
      L2: { marks: [[0, 0], [8000, 0]], metaScale: 0.03 },
      L0: { marks: [[10, 10]], metaScale: null },
    },
    "L3",
    0.05
  );
  assert.equal(frames.L3.frame.metresPerPx, 0.04);
  assert.equal(frames.L2.frame.metresPerPx, 0.03);
  assert.deepEqual(frames.L2.frame.offset, [80 - 120, 0]);
  assert.deepEqual(frames.L0.frame, { metresPerPx: 0.05, offset: [0, 0] });
  assert.match(frames.L0.warning ?? "", /not registered/);
});
