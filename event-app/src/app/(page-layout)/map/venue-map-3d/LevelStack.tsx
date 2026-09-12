"use client";

import { Suspense, useEffect, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Group, MathUtils, Mesh, OrthographicCamera, PerspectiveCamera, Sprite, type Material } from "three";
import { POLAR_ANGLE, SCREEN_PX_PER_SVG_PX } from "./isoMath";
import { easeOutQuint, LEVEL_FADE_MS, LEVEL_FADE_REDUCED_MS, LEVEL_SWITCH_MS, TAP_SLOP_PX } from "./interaction";
import { PlanShapes } from "./PlanShapes";
import { PlanIcons } from "./PlanIcons";
import { levelIndex, type Area, type LevelId, type MapView, type PlanLevel } from "./types";

type LevelStackProps = {
  levels: PlanLevel[];
  /** Floor shown, or null for every floor stacked. */
  level: LevelId | null;
  view: MapView;
  /** World-unit gap between stacked floors. */
  gap: number;
  /** Screen extent of one floor at the start view (px), for the off-screen distance. */
  fit: { width: number; height: number };
  showIcons: boolean;
  reducedMotion: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (area: Area) => void;
  onSelectLevel: (level: LevelId) => void;
  setHovered: (id: string | null) => void;
};

type LevelAnim = { y: number; opacity: number; visible: boolean };
type Tween = {
  level: LevelId;
  fromY: number;
  toY: number;
  fromOpacity: number;
  toOpacity: number;
  start: number;
  duration: number;
  hideAtEnd: boolean;
};

/**
 * Positions the floors and animates floor changes. Rest poses: every floor
 * stacked around y = 0 (G below, L2 above) or the chosen floor at y = 0 with
 * the others parked off-screen on their own side (higher floors above, lower
 * floors below). A change tweens each floor that is visible before or after
 * to its new rest pose, so the leaving floor always moves away from the
 * entering one: G → L1 drops G and lowers L1 in from the top; leaving the
 * stack sends higher floors up and lower floors down. Floors hidden on both
 * ends snap so they never cross the screen. The flat view can't show
 * vertical travel, so it crossfades instead. Refs only; no per-frame React.
 */
export function LevelStack({
  levels,
  level,
  view,
  gap,
  fit,
  showIcons,
  reducedMotion,
  selectedId,
  hoveredId,
  onSelect,
  onSelectLevel,
  setHovered,
}: LevelStackProps) {
  const { camera, size, invalidate } = useThree();
  const groupRefs = useRef(new Map<LevelId, Group>());
  const tweensRef = useRef<Tween[]>([]);
  const fadingRef = useRef(new Set<LevelId>());
  const prevRef = useRef<{ level: LevelId | null; view: MapView }>({ level, view });
  const stackY = (id: LevelId) => (levelIndex(id) - (levels.length - 1) / 2) * gap;
  const animRef = useRef<Map<LevelId, LevelAnim> | null>(null);
  if (animRef.current === null) {
    animRef.current = new Map(
      levels.map((l) => [l.id, { y: level === null ? stackY(l.id) : 0, opacity: 1, visible: level === null || l.id === level }])
    );
  }
  const anims = animRef.current;

  /** World-y at which a floor is fully outside the viewport, at the current zoom (conservative: measured before any refit). */
  const exitOffset = () => {
    let viewHalfH: number;
    if (camera instanceof OrthographicCamera) viewHalfH = size.height / (2 * camera.zoom);
    else {
      const cam = camera as PerspectiveCamera;
      viewHalfH = cam.position.length() * Math.tan(MathUtils.degToRad(cam.fov) / 2);
    }
    const floorHalfH = (fit.height * SCREEN_PX_PER_SVG_PX) / 2;
    return ((viewHalfH + floorHalfH) / Math.sin(POLAR_ANGLE)) * 1.1 + (levels.length * gap) / 2;
  };

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { level, view };
    if (prev.level === level) return;
    const now = performance.now();
    const tweens: Tween[] = [];
    const parked = (id: LevelId, shown: LevelId, exit: number) => Math.sign(levelIndex(id) - levelIndex(shown)) * exit;

    if (view === "top" && prev.level !== null && level !== null) {
      // Crossfade: both floors at y = 0.
      const duration = reducedMotion ? LEVEL_FADE_REDUCED_MS : LEVEL_FADE_MS;
      for (const [id, a] of anims) {
        a.y = 0;
        if (id === prev.level) tweens.push({ level: id, fromY: 0, toY: 0, fromOpacity: a.opacity, toOpacity: 0, start: now, duration, hideAtEnd: true });
        else if (id === level) {
          a.visible = true;
          if (!fadingRef.current.has(id)) a.opacity = 0;
          tweens.push({ level: id, fromY: 0, toY: 0, fromOpacity: a.opacity, toOpacity: 1, start: now, duration, hideAtEnd: false });
        } else {
          a.visible = false;
          a.opacity = 1;
        }
        fadingRef.current.add(id);
      }
    } else {
      const duration = reducedMotion ? 0 : LEVEL_SWITCH_MS;
      const exit = exitOffset();
      // Floors hidden so far sit parked on their side of the floor that was showing (or at y = 0 after a flat-view fade).
      if (prev.level !== null) for (const [id, a] of anims) if (!a.visible) a.y = parked(id, prev.level, exit);
      for (const [id, a] of anims) {
        const showAfter = level === null || id === level;
        const toY = level === null ? stackY(id) : id === level ? 0 : parked(id, level, exit);
        if (!a.visible && !showAfter) {
          a.y = toY; // never on screen: snap
          continue;
        }
        a.visible = true;
        a.opacity = 1;
        tweens.push({ level: id, fromY: a.y, toY, fromOpacity: 1, toOpacity: 1, start: now, duration, hideAtEnd: !showAfter });
      }
    }
    tweensRef.current = tweens;
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, view]);

  // Debug slider: re-space the stack in place.
  useEffect(() => {
    if (level !== null || tweensRef.current.length) return;
    for (const [id, a] of anims) a.y = stackY(id);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gap]);

  useFrame(() => {
    const now = performance.now();
    const remaining: Tween[] = [];
    for (const tw of tweensRef.current) {
      const a = anims.get(tw.level)!;
      const t = tw.duration === 0 ? 1 : Math.min(1, (now - tw.start) / tw.duration);
      const p = easeOutQuint(t);
      a.y = MathUtils.lerp(tw.fromY, tw.toY, p);
      a.opacity = MathUtils.lerp(tw.fromOpacity, tw.toOpacity, p);
      if (t >= 1) {
        if (tw.hideAtEnd) a.visible = false;
        a.opacity = 1;
        fadingRef.current.delete(tw.level);
      } else remaining.push(tw);
    }
    tweensRef.current = remaining;
    for (const [id, a] of anims) {
      const group = groupRefs.current.get(id);
      if (!group) continue;
      group.position.y = a.y;
      group.visible = a.visible;
      if (fadingRef.current.has(id)) setOpacity(group, a.opacity, true);
      else if (group.userData.faded) setOpacity(group, 1, false);
    }
    if (remaining.length) invalidate();
  });

  const stacked = level === null;

  return (
    <>
      {levels.map((l) => (
        <group
          key={l.id}
          ref={(g) => {
            if (g) groupRefs.current.set(l.id, g);
            else groupRefs.current.delete(l.id);
          }}
          position-y={anims.get(l.id)?.y ?? 0}
          visible={anims.get(l.id)?.visible ?? true}
          {...(stacked
            ? {
                onClick: (e: ThreeEvent<MouseEvent>) => {
                  if (e.delta > TAP_SLOP_PX) return;
                  e.stopPropagation();
                  onSelectLevel(l.id);
                },
                onPointerOver: (e: ThreeEvent<PointerEvent>) => {
                  e.stopPropagation();
                  setHovered(`level:${l.id}`);
                },
                onPointerOut: () => setHovered(null),
              }
            : {})}
        >
          <PlanShapes shapes={l.shapes} interactive={!stacked} selectedId={selectedId} hoveredId={hoveredId} onSelect={onSelect} setHovered={setHovered} />
          {showIcons && (
            <Suspense fallback={null}>
              <PlanIcons shapes={l.shapes} interactive={!stacked} onSelect={onSelect} setHovered={setHovered} />
            </Suspense>
          )}
        </group>
      ))}
    </>
  );
}

/** Applies a crossfade opacity to every material under a floor; `transparent` only while fading (depth sorting otherwise suffers). */
function setOpacity(group: Group, opacity: number, fading: boolean) {
  group.traverse((obj) => {
    if (!(obj instanceof Mesh) && !(obj instanceof Sprite)) return;
    const mats: Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      m.opacity = opacity;
      // Sprites are always transparent; the extruded shapes only during a fade.
      if (!(obj instanceof Sprite)) m.transparent = fading;
    }
  });
  group.userData.faded = fading;
}
