"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { BoxGeometry, EdgesGeometry } from "three";
import { groundFromScreen, PX, scaleHex } from "./isoMath";
import { noRaycast, TAP_SLOP_PX } from "./interaction";
import type { Area, SceneBlock } from "./types";

type BlocksProps = {
  blocks: SceneBlock[];
  areaById: Map<string, Area>;
  selectedId: string | null;
  hoveredId: string | null;
  lit: boolean;
  onSelect: (area: Area) => void;
  setHovered: (id: string | null) => void;
};

/** Real cuboids for the stages, classrooms and cowork desk resolved by the build script. */
export function Blocks({ blocks, areaById, selectedId, hoveredId, lit, onSelect, setHovered }: BlocksProps) {
  return (
    <>
      {blocks.map((block) => (
        <Block
          key={block.id}
          block={block}
          area={areaById.get(block.id)}
          selected={block.id === selectedId}
          hovered={block.id === hoveredId}
          lit={lit}
          onSelect={onSelect}
          setHovered={setHovered}
        />
      ))}
    </>
  );
}

const OUTLINE = "#40469C";

function Block({
  block,
  area,
  selected,
  hovered,
  lit,
  onSelect,
  setHovered,
}: {
  block: SceneBlock;
  area: Area | undefined;
  selected: boolean;
  hovered: boolean;
  lit: boolean;
  onSelect: (area: Area) => void;
  setHovered: (id: string | null) => void;
}) {
  const { center, geometry, edges } = useMemo(() => {
    // The top face is drawn at height h; adding h to v drops it onto the floor.
    const footprint = block.top.map(([u, v]) => groundFromScreen(u, v + block.height));
    const xs = footprint.map((p) => p[0]);
    const zs = footprint.map((p) => p[1]);
    const sx = Math.max(...xs) - Math.min(...xs);
    const sz = Math.max(...zs) - Math.min(...zs);
    const h = block.height * PX;
    const geometry = new BoxGeometry(sx, h, sz);
    return {
      center: [(Math.min(...xs) + Math.max(...xs)) / 2, h / 2, (Math.min(...zs) + Math.max(...zs)) / 2] as const,
      geometry,
      edges: new EdgesGeometry(geometry),
    };
  }, [block]);

  const highlight = selected ? 1.18 : hovered ? 1.1 : 1;
  const top = scaleHex(block.fill, highlight);
  // +z faces screen-left, +x faces screen-right at the start view (see isoMath).
  const left = scaleHex(block.fill, 0.86 * highlight);
  const right = scaleHex(block.fill, 0.72 * highlight);
  // BoxGeometry material order: +x, −x, +y, −y, +z, −z
  const faces = [right, right, top, top, left, left];

  const handlers = area
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          // R3F fires click for any press that started on this object; a drag that
          // ends on it is a rotation, not a tap.
          if (e.delta > TAP_SLOP_PX) return;
          e.stopPropagation();
          onSelect(area);
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(block.id);
        },
        onPointerOut: () => setHovered(null),
      }
    : {};

  return (
    <group position={center} {...handlers}>
      <mesh geometry={geometry} castShadow={lit} receiveShadow={lit}>
        {faces.map((color, i) =>
          lit ? (
            <meshStandardMaterial key={i} attach={`material-${i}`} color={i === 2 || i === 3 ? top : block.fill} roughness={0.9} metalness={0} />
          ) : (
            <meshBasicMaterial key={i} attach={`material-${i}`} color={color} toneMapped={false} />
          )
        )}
      </mesh>
      <lineSegments geometry={edges} raycast={noRaycast}>
        <lineBasicMaterial color={block.stroke ?? OUTLINE} toneMapped={false} />
      </lineSegments>
    </group>
  );
}
