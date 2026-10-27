import { Raycaster, Vector2, type Camera, type Intersection, type Object3D, type Scene } from "three";
import type { LevelId } from "../data/levels";
import type { AreaKey } from "../data/resolve";
import { TapRecognizer, TAP_MOVE_PX } from "../camera/gestures";
import { hoverStore, type HoverKey } from "./hoverStore";

/** Objects the pointer can hit live on this layer (areas, sprites, stacked-floor hit planes); everything else is invisible to the raycaster. */
export const HIT_LAYER = 1;

/** What a hit object stands for, on `userData.hit` of the object or an ancestor. */
export type HitTarget = { kind: "area"; key: AreaKey } | { kind: "floor"; level: LevelId };

export type PointerHandlers = {
  onTapArea: (key: AreaKey) => void;
  onTapFloor: (level: LevelId) => void;
  onTapBackground: () => void;
  onDoubleTap: (clientX: number, clientY: number) => void;
};

function targetOf(hit: Intersection): HitTarget | null {
  for (let o: Object3D | null = hit.object; o; o = o.parent) {
    const t = (o.userData as { hit?: HitTarget }).hit;
    if (t) return t;
  }
  return null;
}

/**
 * The one raycast owner of the canvas: hover on every move (frozen while a
 * press has travelled past the tap slop, so a drag never flickers the
 * hover), taps on release (area → select, stacked floor → open, nothing →
 * close the card), double-taps → zoom. No R3F pointer events anywhere else,
 * so there is no over/out pairing to get wrong. Sprites refine their own
 * hit test through `raycast` on the object (per-pixel alpha).
 */
export function attachPointer(element: HTMLElement, camera: Camera, scene: Scene, handlers: PointerHandlers, invalidate: () => void): () => void {
  const raycaster = new Raycaster();
  raycaster.layers.set(HIT_LAYER);
  const ndc = new Vector2();
  const taps = new TapRecognizer();
  let pressStart: { x: number; y: number } | null = null;
  let dragging = false;

  const pick = (clientX: number, clientY: number): HitTarget | null => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const hit of hits) {
      const t = targetOf(hit);
      if (t) return t;
    }
    return null;
  };

  const hoverKey = (t: HitTarget | null): HoverKey => (t === null ? null : t.kind === "area" ? t.key : `level:${t.level}`);

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return; // no hover on touch; taps resolve on release
    if (pressStart && !dragging && Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > TAP_MOVE_PX) dragging = true;
    if (dragging) return;
    hoverStore.set(hoverKey(pick(e.clientX, e.clientY)));
  };
  const onDown = (e: PointerEvent) => {
    taps.pointerDown(e);
    pressStart = { x: e.clientX, y: e.clientY };
    dragging = false;
  };
  const onUp = (e: PointerEvent) => {
    const result = taps.pointerUp(e);
    pressStart = null;
    dragging = false;
    if (!result) return;
    if (result.kind === "double") {
      handlers.onDoubleTap(result.x, result.y);
      return;
    }
    const t = pick(result.x, result.y);
    if (t === null) handlers.onTapBackground();
    else if (t.kind === "area") handlers.onTapArea(t.key);
    else handlers.onTapFloor(t.level);
    if (e.pointerType !== "touch") hoverStore.set(hoverKey(t));
    invalidate();
  };
  const onCancel = () => {
    taps.pointerCancel();
    pressStart = null;
    dragging = false;
  };
  const onLeave = () => {
    if (!pressStart) hoverStore.set(null);
  };

  element.addEventListener("pointermove", onMove);
  element.addEventListener("pointerdown", onDown);
  element.addEventListener("pointerup", onUp);
  element.addEventListener("pointercancel", onCancel);
  element.addEventListener("pointerleave", onLeave);
  return () => {
    element.removeEventListener("pointermove", onMove);
    element.removeEventListener("pointerdown", onDown);
    element.removeEventListener("pointerup", onUp);
    element.removeEventListener("pointercancel", onCancel);
    element.removeEventListener("pointerleave", onLeave);
    hoverStore.set(null);
  };
}
