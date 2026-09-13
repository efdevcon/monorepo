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

/** Slab centre (ground px → world), where the hover label starts. */
function slabCentre(level: PlanLevel): [number, number] {
  const slab = level.shapes.find((s) => s.kind === "slab");
  const [x, z] = slab?.centroid ?? [(level.bounds.minX + level.bounds.maxX) / 2, (level.bounds.minZ + level.bounds.maxZ) / 2];
  return [x * PX, z * PX];
}

/**
 * Floor name that slides out from the floor's centre to the right while the
 * floor is hovered in the stack (Scott). Stays mounted so it can slide back;
 * never takes the pointer.
 */
export function FloorLabel({ level, shown }: { level: PlanLevel; shown: boolean }) {
  const [x, z] = slabCentre(level);
  return (
    <Html position={[x, 0.3, z]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div
        aria-hidden={!shown}
        className={cn(
          "pointer-events-none -translate-y-1/2 whitespace-nowrap rounded-full bg-white/90 px-3 py-1.5 font-heading text-[13px] font-bold leading-none text-dc-fg2 shadow-[0_2px_8px_rgba(22,11,43,0.18)] backdrop-blur",
          "transition-[translate,opacity] duration-150 ease-out motion-reduce:transition-none",
          shown ? "translate-x-4 opacity-100" : "translate-x-0 opacity-0"
        )}
      >
        {level.name}
      </div>
    </Html>
  );
}
