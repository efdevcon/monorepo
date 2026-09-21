"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Group, Shape, ShapeGeometry, Vector2, Vector3 } from "three";
import cn from "classnames";
import { polygonArea, PX } from "./isoMath";
import type { PlanLevel } from "./types";

/**
 * Invisible plane over a stacked floor's whole footprint (slab outline, holes
 * filled), so hovering or tapping through the atrium doesn't reach the floor
 * beneath — that made the hover bounce between floors. Nothing is drawn
 * (colorWrite off); it only exists for the raycaster, and bubbles to the level
 * group's handlers.
 */
export function FloorHitPlane({ level }: { level: PlanLevel }) {
  const geometry = useMemo(() => {
    const slab = level.shapes.find((s) => s.kind === "slab");
    if (!slab) return null;
    // Same shape space as PlanShapes: (X, −Z), rotated onto the ground; outline only, no holes.
    const rings = slab.polygons.map((poly) => poly.map(([x, z]) => new Vector2(x * PX, -z * PX))).sort((a, b) => polygonArea(b) - polygonArea(a));
    const g = new ShapeGeometry(new Shape(rings[0]));
    g.rotateX(-Math.PI / 2);
    return g;
  }, [level]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} position-y={0.02}>
      <meshBasicMaterial colorWrite={false} depthWrite={false} />
    </mesh>
  );
}

/** The four corners of the floor's footprint (level-local world units), a little above the slab top. */
function corners(level: PlanLevel): Vector3[] {
  const b = level.bounds;
  return [
    new Vector3(b.minX * PX, 0.3, b.minZ * PX),
    new Vector3(b.maxX * PX, 0.3, b.minZ * PX),
    new Vector3(b.maxX * PX, 0.3, b.maxZ * PX),
    new Vector3(b.minX * PX, 0.3, b.maxZ * PX),
  ];
}

/**
 * The floor's short label ("G", "L1") beside it in the stack, always visible;
 * the labels of the other floors dim while one floor is hovered (Scott,
 * 2026-09-17). Big, bold and in the muted foreground colour with no surface
 * behind it, so it reads as part of the backdrop rather than a control.
 * Re-anchored each frame at whichever footprint corner is right-most on
 * screen, 24px off it, so it stays beside the floor as the stack turns; 40px
 * on desktop, 24px on phones. (Placing the phone labels under the floors'
 * front corners was tried on 2026-09-17 and read badly.) Clickable since
 * 2026-09-21 (Scott): the label is a button that opens its floor, and hovering
 * it hovers the floor (slab tint, other labels dim) exactly like the pointer
 * over the floor itself. Only the button takes the pointer; the Html wrapper
 * around it stays transparent to it.
 */
export function FloorLabel({ level, dimmed, onOpen, onHover }: { level: PlanLevel; dimmed: boolean; onOpen: () => void; onHover: (hovered: boolean) => void }) {
  const anchor = useRef<Group>(null);
  const pts = useMemo(() => corners(level), [level]);
  const scratch = useMemo(() => new Vector3(), []);
  useFrame(({ camera }) => {
    const g = anchor.current;
    if (!g?.parent) return;
    let best = pts[0];
    let bestX = -Infinity;
    for (const p of pts) {
      const sx = g.parent.localToWorld(scratch.copy(p)).project(camera).x;
      if (sx > bestX) {
        bestX = sx;
        best = p;
      }
    }
    g.position.copy(best);
  });
  return (
    <group ref={anchor} position={pts[1]}>
      <Html zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <button
          type="button"
          aria-label={`Open ${level.name}`}
          onClick={onOpen}
          onPointerEnter={() => onHover(true)}
          onPointerLeave={() => onHover(false)}
          className={cn(
            "pointer-events-auto block cursor-pointer whitespace-nowrap font-heading font-bold leading-none tracking-[-0.5px] text-dc-muted hover:text-dc-purple",
            "translate-x-6 -translate-y-1/2 text-[24px] lg:text-[40px]",
            "transition-[opacity,color] duration-150 ease-out motion-reduce:transition-none",
            dimmed ? "opacity-30" : "opacity-100"
          )}
        >
          {level.label}
        </button>
      </Html>
    </group>
  );
}
