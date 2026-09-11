"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { DoubleSide, EdgesGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from "three";
import { PX, scaleHex } from "./isoMath";
import { noRaycast, TAP_SLOP_PX } from "./interaction";
import type { Area, PlanShape } from "./types";

type PlanShapesProps = {
  shapes: PlanShape[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (area: Area) => void;
  setHovered: (id: string | null) => void;
};

/** Everything extruded from the top-down plan: slab, walls, blocks and floor mats. */
export function PlanShapes({ shapes, selectedId, hoveredId, onSelect, setHovered }: PlanShapesProps) {
  return (
    <>
      {shapes.map((shape) => (
        <PlanShapeMesh
          key={shape.id}
          shape={shape}
          selected={shape.id === selectedId}
          hovered={shape.id === hoveredId}
          onSelect={onSelect}
          setHovered={setHovered}
        />
      ))}
    </>
  );
}

const OUTLINE = "#333A7F";
const HIGHLIGHT_OUTLINE = "#7235ed"; // dc-purple

function polygonArea(poly: Vector2[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
  return Math.abs(a / 2);
}

function PlanShapeMesh({
  shape,
  selected,
  hovered,
  onSelect,
  setHovered,
}: {
  shape: PlanShape;
  selected: boolean;
  hovered: boolean;
  onSelect: (area: Area) => void;
  setHovered: (id: string | null) => void;
}) {
  const { geometry, edges, y } = useMemo(() => {
    // Shape space is (X, −Z); rotateX(−90°) then maps (x, y, depth) → (x, depth, −y), i.e. up = +Y, and world z = Z.
    const rings = shape.polygons
      .map((poly) => poly.map(([x, z]) => new Vector2(x * PX, -z * PX)))
      .sort((a, b) => polygonArea(b) - polygonArea(a));
    const outline = new Shape(rings[0]);
    for (const hole of rings.slice(1)) outline.holes.push(new Path(hole));
    const depth = shape.height * PX;
    const geometry = new ExtrudeGeometry(outline, { depth, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    return { geometry, edges: new EdgesGeometry(geometry, 15), y: shape.kind === "slab" ? -depth : 0 };
  }, [shape]);

  const highlight = selected ? 1.15 : hovered ? 1.08 : 1;
  const cap = scaleHex(shape.fill, highlight);
  const side = scaleHex(shape.fill, 0.82 * highlight);

  const handlers = shape.tappable
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (e.delta > TAP_SLOP_PX) return;
          e.stopPropagation();
          onSelect({ id: shape.id, name: shape.name, description: shape.description, icon: shape.icon });
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(shape.id);
        },
        onPointerOut: () => setHovered(null),
      }
    : {};

  return (
    <group position={[0, y, 0]} {...handlers}>
      <mesh geometry={geometry} castShadow receiveShadow>
        {/* ExtrudeGeometry groups: 0 = caps, 1 = sides */}
        <meshStandardMaterial attach="material-0" color={cap} roughness={0.9} metalness={0} side={DoubleSide} />
        <meshStandardMaterial attach="material-1" color={side} roughness={0.9} metalness={0} side={DoubleSide} />
      </mesh>
      {(shape.kind !== "mat" || hovered || selected) && (
        <lineSegments geometry={edges} raycast={noRaycast}>
          <lineBasicMaterial color={hovered || selected ? HIGHLIGHT_OUTLINE : shape.stroke ?? OUTLINE} toneMapped={false} />
        </lineSegments>
      )}
    </group>
  );
}
