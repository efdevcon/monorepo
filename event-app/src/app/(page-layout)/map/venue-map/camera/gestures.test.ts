import assert from "node:assert/strict";
import { test } from "node:test";
import { DOUBLE_TAP_MS, TapRecognizer } from "./gestures";

const ev = (id: number, x: number, y: number, t: number, primary = true) => ({ pointerId: id, isPrimary: primary, clientX: x, clientY: y, timeStamp: t });

test("tap, then a quick second tap is a double tap", () => {
  const r = new TapRecognizer();
  r.pointerDown(ev(1, 10, 10, 0));
  assert.deepEqual(r.pointerUp(ev(1, 12, 11, 100)), { kind: "tap", x: 12, y: 11 });
  r.pointerDown(ev(1, 14, 12, 200));
  assert.deepEqual(r.pointerUp(ev(1, 14, 12, 260)), { kind: "double", x: 14, y: 12 });
  r.pointerDown(ev(1, 14, 12, 300));
  assert.equal(r.pointerUp(ev(1, 14, 12, 350))?.kind, "tap", "a third tap starts over");
});

test("drags, long holds and pinches are never taps", () => {
  const r = new TapRecognizer();
  r.pointerDown(ev(1, 0, 0, 0));
  assert.equal(r.pointerUp(ev(1, 30, 0, 100)), null);
  r.pointerDown(ev(1, 0, 0, 0));
  assert.equal(r.pointerUp(ev(1, 0, 0, 900)), null);
  r.pointerDown(ev(1, 0, 0, 0));
  r.pointerDown(ev(2, 50, 0, 10, false));
  assert.equal(r.pointerUp(ev(2, 50, 0, 50, false)), null);
  assert.equal(r.pointerUp(ev(1, 0, 0, 60)), null);
});

test("a slow second tap is a plain tap; a lost pointerup is forgotten by the next primary press", () => {
  const r = new TapRecognizer();
  r.pointerDown(ev(1, 0, 0, 0));
  r.pointerUp(ev(1, 0, 0, 50));
  r.pointerDown(ev(1, 0, 0, 50 + DOUBLE_TAP_MS + 1));
  assert.equal(r.pointerUp(ev(1, 0, 0, 50 + DOUBLE_TAP_MS + 60))?.kind, "tap");
  r.pointerDown(ev(3, 0, 0, 1000)); // never released
  r.pointerDown(ev(4, 0, 0, 2000));
  assert.equal(r.pointerUp(ev(4, 0, 0, 2050))?.kind, "tap");
});
