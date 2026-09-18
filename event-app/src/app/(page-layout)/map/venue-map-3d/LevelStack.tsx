"use client";

import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Group, MathUtils, OrthographicCamera, PerspectiveCamera, Vector3, type Object3D } from "three";
import { HEADER_OFFSET_DESKTOP } from "@/hooks/useIsDesktop";
import { POLAR_ANGLE, PX } from "./isoMath";
import { easeOutQuint, LEVEL_SWITCH_MS, TAP_SLOP_PX } from "./interaction";
import { PlanShapes } from "./PlanShapes";
import { PlanIcons } from "./PlanIcons";
import { FloorHitPlane, FloorLabel } from "./FloorHover";
import { levelIndex, type Area, type GroundBounds, type LevelId, type PlanLevel } from "./types";

type LevelStackProps = {
  levels: PlanLevel[];
  /** Floor shown, or null for every floor stacked. */
  level: LevelId | null;
  /** World-unit gap between stacked floors. */
  gap: number;
  /** Union floor rectangle in ground px, for the off-screen parking distance. */
  bounds: GroundBounds;
  showIcons: boolean;
  reducedMotion: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  highlightedIds: ReadonlySet<string> | null;
  onSelect: (area: Area) => void;
  onSelectLevel: (level: LevelId) => void;
  setHovered: (id: string | null) => void;
  /** Desktop breakpoint (useIsDesktop, the same `lg:` the card's CSS forks on): the card is anchored to the footprint. */
  desktop: boolean;
  /** Receives `--poi-x` / `--poi-y` (page px) for the area card beside the selected footprint (desktop). */
  cardAnchorRef?: MutableRefObject<HTMLDivElement | null>;
};

/** Card placement beside the selected footprint (desktop): gap to the footprint's screen point and the viewport inset. */
const CARD_GAP_PX = 20;
const CARD_INSET_PX = 16;
/** The card's icon disc (AreaCard: 64px, raised 70%) overhangs the wrapper's top by this much. */
const CARD_DISC_OVERHANG_PX = 45;
/** Wrapper top that keeps the disc clear of the sticky desktop header, plus a little air. */
const CARD_MIN_TOP_PX = HEADER_OFFSET_DESKTOP + CARD_DISC_OVERHANG_PX + 12;
/** World units above a footprint's top where its icon sprite is centred (PlanIcons: lift + ~half a sprite). */
const CARD_ICON_CENTRE_LIFT = 0.6;

type LevelAnim = { y: number; visible: boolean };
type Tween = { level: LevelId; fromY: number; toY: number; start: number; duration: number; hideAtEnd: boolean };

/**
 * Positions the floors and animates floor changes. Rest poses: every floor
 * stacked around y = 0 (G below, L2 above) or the chosen floor at y = 0 with
 * the others parked off-screen on their own side (higher floors above, lower
 * floors below). A change tweens each floor that is visible before or after
 * to its new rest pose, so the leaving floor always moves away from the
 * entering one: G → L1 drops G and lowers L1 in from the top; leaving the
 * stack sends higher floors up and lower floors down. Floors hidden on both
 * ends snap so they never cross the screen. Refs only; no per-frame React.
 */
export function LevelStack({
  levels,
  level,
  gap,
  bounds,
  showIcons,
  reducedMotion,
  selectedId,
  hoveredId,
  highlightedIds,
  onSelect,
  onSelectLevel,
  setHovered,
  desktop,
  cardAnchorRef,
}: LevelStackProps) {
  const { camera, size, invalidate } = useThree();
  // The card's size, kept current by a ResizeObserver rather than read from layout every frame; a
  // size change (the live-session block arriving on the 60s tick) re-anchors even with the camera still.
  const cardSizeRef = useRef({ w: 0, h: 0 });
  useEffect(() => {
    const el = cardAnchorRef?.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const { offsetWidth: w, offsetHeight: h } = el;
      if (w === cardSizeRef.current.w && h === cardSizeRef.current.h) return;
      cardSizeRef.current = { w, h };
      invalidate();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
    // The wrapper element mounts once with the card (AreaCard stays mounted); re-run per selection in case it didn't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardAnchorRef, selectedId]);
  // The selected footprint (key `${level}/${id}`), looked up once per selection for the per-frame card anchor.
  const selectedShape = useMemo(() => {
    if (!selectedId) return null;
    const slash = selectedId.indexOf("/");
    const level = levels.find((l) => l.id === selectedId.slice(0, slash));
    return level?.shapes.find((sh) => sh.id === selectedId.slice(slash + 1)) ?? null;
  }, [levels, selectedId]);
  const anchorScratch = useMemo(() => new Vector3(), []);
  const groupRefs = useRef(new Map<LevelId, Group>());
  const tweensRef = useRef<Tween[]>([]);
  const prevRef = useRef<LevelId | null>(level);
  const stackY = (id: LevelId) => (levelIndex(id) - (levels.length - 1) / 2) * gap;
  const animRef = useRef<Map<LevelId, LevelAnim> | null>(null);
  if (animRef.current === null) {
    animRef.current = new Map(levels.map((l) => [l.id, { y: level === null ? stackY(l.id) : 0, visible: level === null || l.id === level }]));
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
    // Half the floor's ground diagonal bounds its projected half-height at any rotation.
    const floorHalfH = (Math.hypot(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) * PX) / 2;
    return ((viewHalfH + floorHalfH) / Math.sin(POLAR_ANGLE)) * 1.1 + (levels.length * gap) / 2;
  };

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = level;
    if (prev === level) return;
    // The stacked-view handlers and hit planes come and go with the level: R3F fires no
    // pointer-out for objects that unmount, so a floor hover would otherwise stay stuck.
    setHovered(null);
    const now = performance.now();
    const tweens: Tween[] = [];
    const parked = (id: LevelId, shown: LevelId, exit: number) => Math.sign(levelIndex(id) - levelIndex(shown)) * exit;
    const duration = reducedMotion ? 0 : LEVEL_SWITCH_MS;
    const exit = exitOffset();
    // Floors hidden so far sit parked on their side of the floor that was showing.
    if (prev !== null) for (const [id, a] of anims) if (!a.visible) a.y = parked(id, prev, exit);
    for (const [id, a] of anims) {
      const showAfter = level === null || id === level;
      const toY = level === null ? stackY(id) : id === level ? 0 : parked(id, level, exit);
      if (!a.visible && !showAfter) {
        a.y = toY; // never on screen: snap
        continue;
      }
      a.visible = true;
      tweens.push({ level: id, fromY: a.y, toY, start: now, duration, hideAtEnd: !showAfter });
    }
    tweensRef.current = tweens;
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // Debug slider: re-space the stack in place.
  useEffect(() => {
    if (level !== null || tweensRef.current.length) return;
    for (const [id, a] of anims) a.y = stackY(id);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gap]);

  const stacked = level === null;
  // Hovered floor in the stack: light slab tint (PlanShapes) and the other floors' labels dim (FloorLabel).
  const hoveredLevel = stacked && hoveredId?.startsWith("level:") ? (hoveredId.slice("level:".length) as LevelId) : null;

  useFrame(() => {
    const now = performance.now();
    const remaining: Tween[] = [];
    for (const tw of tweensRef.current) {
      const a = anims.get(tw.level)!;
      const t = tw.duration === 0 ? 1 : Math.min(1, (now - tw.start) / tw.duration);
      a.y = MathUtils.lerp(tw.fromY, tw.toY, easeOutQuint(t));
      if (t >= 1) {
        if (tw.hideAtEnd) a.visible = false;
      } else remaining.push(tw);
    }
    tweensRef.current = remaining;
    for (const [id, a] of anims) {
      const group = groupRefs.current.get(id);
      if (!group) continue;
      group.position.y = a.y;
      group.visible = a.visible;
    }
    if (remaining.length) invalidate();

    // Desktop area card: hang the card off the footprint's icon — its top-left a gap below-right of
    // the icon's centre — flipping to below-left when it would leave the viewport on the right and
    // above the icon only when there is no room below (Scott: bottom right / left of the POI, close
    // to it). Written as CSS variables on the card's wrapper (AreaCard reads them from lg up); no
    // React per frame.
    const el = cardAnchorRef?.current;
    if (el && selectedShape && desktop) {
      const group = groupRefs.current.get(selectedShape.level);
      if (group) {
        const [cx, cz] = selectedShape.centroid;
        anchorScratch.set(cx * PX, group.position.y + selectedShape.height * PX + CARD_ICON_CENTRE_LIFT, cz * PX).project(camera);
        const x = ((anchorScratch.x + 1) / 2) * size.width;
        const y = ((1 - anchorScratch.y) / 2) * size.height;
        const { w, h } = cardSizeRef.current;
        let left = x + CARD_GAP_PX;
        if (left + w > size.width - CARD_INSET_PX) left = x - CARD_GAP_PX - w;
        let top = y + CARD_GAP_PX / 2;
        if (top + h > size.height - CARD_INSET_PX) top = y - h - CARD_GAP_PX / 2;
        left = MathUtils.clamp(left, CARD_INSET_PX, Math.max(CARD_INSET_PX, size.width - w - CARD_INSET_PX));
        top = MathUtils.clamp(top, CARD_MIN_TOP_PX, Math.max(CARD_MIN_TOP_PX, size.height - h - CARD_INSET_PX));
        el.style.setProperty("--poi-x", `${Math.round(left)}px`);
        el.style.setProperty("--poi-y", `${Math.round(top)}px`);
      }
    }
  });

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
                // R3F tracks hover per hit object, so leaving a block fires the group's out while the pointer
                // is still on this floor's hit plane (which stays hovered, so no fresh over follows) — the
                // hover dropped on every block, wall and mat. The out event carries the new hits: keep the
                // hover while any of them is still one of ours.
                onPointerOut: (e: ThreeEvent<PointerEvent>) => {
                  const g = groupRefs.current.get(l.id);
                  const stillOurs = e.intersections.some((hit) => {
                    for (let o: Object3D | null = hit.object; o; o = o.parent) if (o === g) return true;
                    return false;
                  });
                  if (!stillOurs) setHovered(null);
                },
              }
            : {})}
        >
          <PlanShapes shapes={l.shapes} interactive={!stacked} selectedId={selectedId} hoveredId={hoveredId} highlightedIds={highlightedIds} floorHovered={hoveredLevel === l.id} onSelect={onSelect} setHovered={setHovered} />
          {stacked && <FloorHitPlane level={l} />}
          {stacked && <FloorLabel level={l} dimmed={hoveredLevel !== null && hoveredLevel !== l.id} />}
          {showIcons && (
            <Suspense fallback={null}>
              <PlanIcons shapes={l.shapes} interactive={!stacked} selectedId={selectedId} hoveredId={hoveredId} highlightedIds={highlightedIds} reducedMotion={reducedMotion} onSelect={onSelect} setHovered={setHovered} />
            </Suspense>
          )}
        </group>
      ))}
    </>
  );
}
