"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, MathUtils, OrthographicCamera, PerspectiveCamera, Vector3 } from "three";
import { HEADER_OFFSET_DESKTOP } from "@/hooks/useIsDesktop";
import { LEVEL_SWITCH_MS, POLAR_ANGLE } from "../camera/constants";
import { easeOutQuint, progress } from "../camera/tween";
import { LEVELS, type LevelId } from "../data/levels";
import { areaOf, plan, type AreaKey } from "../data/resolve";
import { AreaIcons } from "../geometry/AreaIcons";
import { FloorMeshes } from "../geometry/FloorMeshes";
import { hoverStore } from "../interaction/hoverStore";
import { FloorHitPlane } from "./FloorHitPlane";
import { FloorLabel } from "./FloorLabel";
import { planFloorTransition, stackY, type FloorMove, type FloorPose } from "./placement";

type FloorStackProps = {
  floor: LevelId | null;
  gap: number;
  showIcons: boolean;
  reducedMotion: boolean;
  selected: AreaKey | null;
  group: ReadonlySet<AreaKey> | null;
  desktop: boolean;
  onOpenFloor: (level: LevelId) => void;
  /** Receives `--poi-x` / `--poi-y` (page px) for the area card beside the selected footprint (desktop). */
  cardAnchorRef: MutableRefObject<HTMLDivElement | null>;
};

/** Desktop card placement beside the selected footprint. */
const CARD_GAP_PX = 20;
const CARD_INSET_PX = 16;
const CARD_DISC_OVERHANG_PX = 45;
const CARD_MIN_TOP_PX = HEADER_OFFSET_DESKTOP + CARD_DISC_OVERHANG_PX + 12;
/** Metres above a footprint's top where the card hangs from (about the sprite's centre). */
const CARD_ANCHOR_LIFT_M = 3;

type Tween = FloorMove & { start: number; duration: number };

/**
 * Positions the floors and animates floor changes (placement.ts decides the
 * poses, this runs the tweens on refs, no React per frame). In the stack each
 * floor carries a hit plane and a label; the open floor's areas and sprites
 * take the pointer instead (only that floor's: the parked floors are invisible
 * but a raycaster still hits them). Also writes the desktop card anchor.
 */
export function FloorStack({ floor, gap, showIcons, reducedMotion, selected, group, desktop, onOpenFloor, cardAnchorRef }: FloorStackProps) {
  const { camera, size, invalidate } = useThree();
  const groupRefs = useRef(new Map<LevelId, Group>());
  const poses = useRef<Map<LevelId, FloorPose>>(new Map(LEVELS.map((l) => [l.id, { y: floor === null ? stackY(l.id, gap) : 0, visible: floor === null || l.id === floor }])));
  const tweens = useRef<Tween[]>([]);
  const prevFloor = useRef(floor);
  const stacked = floor === null;

  /** World-y at which a floor is fully outside the viewport at the current zoom (measured before any refit). */
  const exitOffset = () => {
    let viewHalfH: number;
    if (camera instanceof OrthographicCamera) viewHalfH = size.height / (2 * camera.zoom);
    else {
      const cam = camera as PerspectiveCamera;
      viewHalfH = cam.position.length() * Math.tan(MathUtils.degToRad(cam.fov) / 2);
    }
    const b = plan.bounds;
    const floorHalfH = Math.hypot(b.maxX - b.minX, b.maxZ - b.minZ) / 2;
    return ((viewHalfH + floorHalfH) / Math.sin(POLAR_ANGLE)) * 1.1 + (LEVELS.length * gap) / 2;
  };

  useEffect(() => {
    const prev = prevFloor.current;
    prevFloor.current = floor;
    if (prev === floor) return;
    hoverStore.set(null); // the hit planes and areas swap roles; a stale hover would stick
    const { moves, snaps } = planFloorTransition(poses.current, prev, floor, gap, exitOffset());
    for (const [id, pose] of snaps) poses.current.set(id, pose);
    const now = performance.now();
    for (const m of moves) poses.current.set(m.level, { y: m.fromY, visible: true });
    tweens.current = moves.map((m) => ({ ...m, start: now, duration: reducedMotion ? 0 : LEVEL_SWITCH_MS }));
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor]);

  // Debug slider: re-space the stack in place.
  useEffect(() => {
    if (floor !== null || tweens.current.length) return;
    for (const [id, pose] of poses.current) pose.y = stackY(id, gap);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gap]);

  // Card size via ResizeObserver (never a per-frame layout read).
  const cardSize = useRef({ w: 0, h: 0 });
  useEffect(() => {
    const el = cardAnchorRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const { offsetWidth: w, offsetHeight: h } = el;
      if (w === cardSize.current.w && h === cardSize.current.h) return;
      cardSize.current = { w, h };
      invalidate();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [cardAnchorRef, selected, invalidate]);
  const selectedArea = useMemo(() => (selected ? areaOf(selected) : null), [selected]);
  const scratch = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const now = performance.now();
    const remaining: Tween[] = [];
    for (const tw of tweens.current) {
      const pose = poses.current.get(tw.level)!;
      const t = progress(tw.start, tw.duration, now);
      pose.y = MathUtils.lerp(tw.fromY, tw.toY, easeOutQuint(t));
      if (t >= 1) {
        if (tw.hideAtEnd) pose.visible = false;
      } else remaining.push(tw);
    }
    tweens.current = remaining;
    for (const [id, pose] of poses.current) {
      const g = groupRefs.current.get(id);
      if (!g) continue;
      g.position.y = pose.y;
      g.visible = pose.visible;
    }
    if (remaining.length) invalidate();

    // Desktop card: hang it below-right of the footprint's anchor, flipping left / above at the viewport edges.
    const el = cardAnchorRef.current;
    if (el && selectedArea && desktop) {
      const g = groupRefs.current.get(selectedArea.level);
      if (g) {
        const [cx, cz] = selectedArea.shape.anchor;
        scratch.set(cx, g.position.y + (selectedArea.shape.base ?? 0) + selectedArea.shape.height + CARD_ANCHOR_LIFT_M, cz).project(camera);
        const x = ((scratch.x + 1) / 2) * size.width;
        const y = ((1 - scratch.y) / 2) * size.height;
        const { w, h } = cardSize.current;
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
      {LEVELS.map((l) => (
        <group
          key={l.id}
          ref={(g) => {
            if (g) groupRefs.current.set(l.id, g);
            else groupRefs.current.delete(l.id);
          }}
          position-y={poses.current.get(l.id)?.y ?? 0}
          visible={poses.current.get(l.id)?.visible ?? true}
        >
          {/* Only the open floor takes the pointer: the raycaster ignores `visible`, so a parked floor would be hit through the open one (2026-10-26). */}
          <FloorMeshes level={l.id} interactive={floor === l.id} selected={selected} group={group} />
          {stacked && <FloorHitPlane level={l.id} />}
          {stacked && <FloorLabel level={l.id} onOpen={() => onOpenFloor(l.id)} />}
          {showIcons && <AreaIcons level={l.id} interactive={floor === l.id} selected={selected} group={group} reducedMotion={reducedMotion} />}
        </group>
      ))}
    </>
  );
}
