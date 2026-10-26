"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { LevelId } from "../data/levels";
import type { GroundBounds } from "../data/planSchema";
import type { AreaKey } from "../data/resolve";
import { areaOf, plan } from "../data/resolve";
import type { Focus } from "../state/mapStore";
import { LEVEL_SWITCH_MS } from "./constants";
import { boundsOfBoxes } from "./fit";
import { CameraRigController, type MapCamera, type RigEnv } from "./rig";
import { easeOutQuint } from "./tween";

export type CameraRigProps = {
  /** Floors stacked (count + gap) or null when one floor shows. */
  stack: { count: number; gap: number } | null;
  /** The open floor (its own bounds are what the whole-floor views frame), null while stacked. */
  floor: LevelId | null;
  desktop: boolean;
  reducedMotion: boolean;
  rotateLeftDeg: number;
  rotateRightDeg: number;
  /** Store-driven camera commands: a new `focus.seq` centres on its keys, a new `resetSeq` returns to the start view. */
  focus: Focus | null;
  resetSeq: number;
  debug: boolean;
  onInteract: () => void;
  /** The live controller, for the pointer owner (double-tap zoom) and the floor stack (exit offset). */
  rigRef: MutableRefObject<CameraRigController | null>;
};

/**
 * Mounts the rig on the canvas and turns state changes into camera
 * commands in one effect per command kind (focus, reset, stack ↔ floor
 * settle), in that priority: when a floor opens because of a focus, the
 * focus tween is the one that runs. Resize re-fits through the rig.
 */
export function CameraRig({ stack, floor, desktop, reducedMotion, rotateLeftDeg, rotateRightDeg, focus, resetSeq, debug, onInteract, rigRef }: CameraRigProps) {
  const { camera, gl, size, invalidate } = useThree();
  const bounds: GroundBounds = plan.bounds;
  const floorBounds = useMemo(() => (floor ? (plan.levels.find((l) => l.id === floor)?.bounds ?? null) : null), [floor]);
  const env: RigEnv = { size, stack, floorBounds, desktop, rotateLeftDeg, rotateRightDeg };
  const envRef = useRef(env);
  envRef.current = env;
  const onInteractRef = useRef(onInteract);
  onInteractRef.current = onInteract;
  const duration = reducedMotion ? 0 : LEVEL_SWITCH_MS;

  // One rig per camera / canvas.
  useEffect(() => {
    const rig = new CameraRigController(camera as MapCamera, gl.domElement, bounds, envRef.current, invalidate);
    rig.onInteract = () => onInteractRef.current();
    rigRef.current = rig;
    return () => {
      rig.dispose();
      rigRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, gl]);

  // Environment: clamps, pan speed, viewport.
  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    rig.env = envRef.current;
    rig.applyEnv();
    rig.resize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, desktop, rotateLeftDeg, rotateRightDeg]);

  // Stack ↔ floor, or floor → floor (each floor has its own fit): re-fit on the floors' clock, keeping the user's turn. Skipped on mount and when a focus or reset runs in the same commit.
  // A focus that is already pending when the canvas mounts (a deep link lands before the client-only Scene) still runs: prevFocus starts at 0.
  const stackKey = stack ? `${stack.count}:${stack.gap}` : `floor:${floor}`;
  const prevStack = useRef(stackKey);
  const prevFocus = useRef(0);
  const prevReset = useRef(resetSeq);
  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    rig.env = envRef.current;
    const stackChanged = prevStack.current !== stackKey;
    const focusChanged = (focus?.seq ?? 0) !== prevFocus.current;
    const resetChanged = resetSeq !== prevReset.current;
    prevStack.current = stackKey;
    prevFocus.current = focus?.seq ?? 0;
    prevReset.current = resetSeq;
    if (focusChanged && focus) {
      const areas = focus.keys.map(areaOf).filter((a): a is NonNullable<typeof a> => a !== null);
      if (!areas.length) return;
      const group = areas.length > 1 ? boundsOfBoxes(areas.map((a) => a.shape.bbox)) : null;
      const primary = areas.find((a) => a.key === focus.keys[0]) ?? areas[0];
      const target: [number, number] = group ? [(group.minX + group.maxX) / 2, (group.minZ + group.maxZ) / 2] : primary.shape.anchor;
      rig.refit();
      rig.focus(target, focus.zoom, group, duration, easeOutQuint);
      return;
    }
    if (resetChanged) {
      rig.reset(duration, easeOutQuint);
      return;
    }
    if (stackChanged) rig.settle(duration, easeOutQuint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stackKey, focus?.seq, resetSeq]);

  useFrame((_, delta) => {
    const rig = rigRef.current;
    if (!rig) return;
    if (rig.tick(delta)) invalidate();
    if (debug) {
      (window as unknown as { __mapCamera?: object }).__mapCamera = rig.snapshot();
      (window as unknown as { __mapControls?: object }).__mapControls = rig.controls;
    }
  });

  return null;
}

/** The keys a focus should centre on, resolved to footprints (shared with the pointer owner's background check). */
export const focusKeys = (focus: Focus | null): AreaKey[] => focus?.keys ?? [];
