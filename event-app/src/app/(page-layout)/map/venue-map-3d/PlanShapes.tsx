"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { EdgesGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from "three";
import { polygonArea, PX, scaleHex } from "./isoMath";
import { noRaycast, TAP_SLOP_PX } from "./interaction";
import { areaOf, shapeKey } from "./planArea";
import type { Area, PlanShape } from "./types";

type PlanShapesProps = {
  shapes: PlanShape[];
  /** False while every floor is stacked: taps then pick a floor (LevelStack), not an area. */
  interactive: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  /** Found group (Find picks "Toilets · Level 1"): every member reads like a hover. */
  highlightedIds: ReadonlySet<string> | null;
  /** The whole floor is hovered in the stacked view: the slab takes a light lavender tint. */
  floorHovered?: boolean;
  onSelect: (area: Area) => void;
  setHovered: (id: string | null) => void;
};

/** Everything extruded from one floor's plan: slab, walls, blocks and floor mats. */
export function PlanShapes({ shapes, interactive, selectedId, hoveredId, highlightedIds, floorHovered = false, onSelect, setHovered }: PlanShapesProps) {
  return (
    <>
      {shapes.map((shape) => (
        <PlanShapeMesh
          key={shape.id}
          shape={shape}
          selected={shapeKey(shape) === selectedId}
          hovered={shapeKey(shape) === hoveredId || (highlightedIds?.has(shapeKey(shape)) ?? false)}
          tinted={floorHovered && shape.kind === "slab"}
          interactive={interactive}
          onSelect={onSelect}
          setHovered={setHovered}
        />
      ))}
    </>
  );
}

const OUTLINE = "#333A7F";
const HIGHLIGHT_OUTLINE = "#7235ed"; // dc-purple
/** Hovered-floor slab tint: the slab colour pulled this far towards dc-purple. */
const FLOOR_TINT = 0.14;

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

function PlanShapeMesh({
  shape,
  selected,
  hovered,
  tinted,
  interactive,
  onSelect,
  setHovered,
}: {
  shape: PlanShape;
  selected: boolean;
  hovered: boolean;
  /** Slab of the hovered floor (stacked view). */
  tinted: boolean;
  interactive: boolean;
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
  const base = tinted ? mixHex(shape.fill, HIGHLIGHT_OUTLINE, FLOOR_TINT) : shape.fill;
  const cap = scaleHex(base, highlight);
  const side = scaleHex(base, 0.82 * highlight);

  const handlers =
    shape.tappable && interactive
      ? {
          onClick: (e: ThreeEvent<MouseEvent>) => {
            if (e.delta > TAP_SLOP_PX) return;
            e.stopPropagation();
            onSelect(areaOf(shape));
          },
          onPointerOver: (e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            setHovered(shapeKey(shape));
          },
          onPointerOut: () => setHovered(null),
        }
      : {};

  return (
    <group position={[0, y, 0]} {...handlers}>
      <mesh geometry={geometry}>
        {/* ExtrudeGeometry groups: 0 = caps, 1 = sides. Front faces only: a block's bottom cap is coplanar with the
            slab top it stands on and z-fought along the edge when both sides drew. polygonOffset pushes the faces
            back a hair so the outline lines, which lie exactly on the surface edges, win the depth test. */}
        <meshStandardMaterial attach="material-0" color={cap} roughness={0.9} metalness={0} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
        <meshStandardMaterial attach="material-1" color={side} roughness={0.9} metalness={0} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      {shape.outline && (shape.kind !== "mat" || hovered || selected) && (
        <lineSegments geometry={edges} raycast={noRaycast}>
          <lineBasicMaterial color={hovered || selected ? HIGHLIGHT_OUTLINE : shape.stroke ?? OUTLINE} toneMapped={false} />
        </lineSegments>
      )}
    </group>
  );
}
