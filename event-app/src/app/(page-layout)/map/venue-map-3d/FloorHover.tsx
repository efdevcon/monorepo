"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { Shape, ShapeGeometry, Vector2 } from "three";
import cn from "classnames";
import { PX } from "./isoMath";
import type { PlanLevel } from "./types";

function ringArea(poly: Vector2[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
  return Math.abs(a / 2);
}

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
    const rings = slab.polygons.map((poly) => poly.map(([x, z]) => new Vector2(x * PX, -z * PX))).sort((a, b) => ringArea(b) - ringArea(a));
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

/**
 * The floor's right-most corner on screen at the start orientation (+X / −Z in
 * the isometric view; ground px → world): where the hover label starts, so it
 * sits beside the floor rather than on it.
 */
function rightCorner(level: PlanLevel): [number, number] {
  const b = level.bounds;
  return [b.maxX * PX, b.minZ * PX];
}

/**
 * Floor name that slides out to the right from the floor's right-hand edge
 * while the floor is hovered in the stack. Big, bold and in the muted
 * foreground colour with no surface behind it, so it reads as part of the
 * backdrop rather than a control (Scott). Stays mounted so it can slide back;
 * never takes the pointer.
 */
export function FloorLabel({ level, shown }: { level: PlanLevel; shown: boolean }) {
  const [x, z] = rightCorner(level);
  return (
    <Html position={[x, 0.3, z]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <p
        aria-hidden={!shown}
        className={cn(
          "pointer-events-none -translate-y-1/2 whitespace-nowrap font-heading text-[40px] font-bold leading-none tracking-[-0.5px] text-dc-muted",
          "transition-[translate,opacity] duration-150 ease-out motion-reduce:transition-none",
          shown ? "translate-x-6 opacity-100" : "translate-x-0 opacity-0"
        )}
      >
        {level.name}
      </p>
    </Html>
  );
}
