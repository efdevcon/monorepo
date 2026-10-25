"use client";

import { useEffect, useMemo, useRef } from "react";
import { Mesh, Shape, ShapeGeometry, Vector2 } from "three";
import type { LevelId } from "../data/levels";
import { levelOf } from "../data/resolve";
import { HIT_LAYER } from "../interaction/pointer";
import { useHovered } from "../interaction/hoverStore";
import { FLOOR_TINT, HIGHLIGHT } from "../geometry/materials";

/**
 * A plane over a stacked floor's whole footprint (slab outline, holes
 * filled): it takes the pointer for the floor, so hovering or tapping
 * through an atrium never reaches the floor beneath, and it draws the hover
 * tint (a light wash towards dc-purple) when the floor is hovered.
 */
export function FloorHitPlane({ level }: { level: LevelId }) {
  const geometry = useMemo(() => {
    const slab = levelOf(level).shapes.find((s) => s.kind === "slab");
    if (!slab) return null;
    const largest = slab.polygons.reduce((a, b) => (b.outer.length > a.outer.length ? b : a));
    const g = new ShapeGeometry(new Shape(largest.outer.map(([x, z]) => new Vector2(x, -z))));
    g.rotateX(-Math.PI / 2);
    return g;
  }, [level]);
  const hovered = useHovered(`level:${level}`);
  const ref = useRef<Mesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    m.userData.hit = { kind: "floor", level };
    m.layers.enable(HIT_LAYER);
  }, [level]);
  if (!geometry) return null;
  return (
    <mesh ref={ref} geometry={geometry} position-y={0.05}>
      <meshBasicMaterial color={HIGHLIGHT} transparent opacity={hovered ? FLOOR_TINT : 0} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
