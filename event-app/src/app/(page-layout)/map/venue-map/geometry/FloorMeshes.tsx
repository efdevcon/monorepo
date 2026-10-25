"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Mesh } from "three";
import type { LevelId } from "../data/levels";
import type { AreaKey } from "../data/resolve";
import { HIT_LAYER } from "../interaction/pointer";
import { useHovered } from "../interaction/hoverStore";
import { buildFloorGeometry } from "./buildFloor";
import { areaColours, lineMaterial, meshMaterial, outlineColour, staticMaterial, type AreaLook } from "./materials";

type FloorMeshesProps = {
  level: LevelId;
  /** The floor is open: areas take the pointer. Stacked floors are picked whole (FloorHitPlane). */
  interactive: boolean;
  selected: AreaKey | null;
  /** A found group: every member reads like a hover. */
  group: ReadonlySet<AreaKey> | null;
};

/** Everything extruded from one floor: the merged statics and one mesh per tappable area. */
export function FloorMeshes({ level, interactive, selected, group }: FloorMeshesProps) {
  const geometry = useMemo(() => buildFloorGeometry(level), [level]);
  return (
    <>
      <mesh geometry={geometry.statics} material={staticMaterial} />
      <lineSegments geometry={geometry.staticEdges} material={lineMaterial("#333a7f")} />
      {[...geometry.areas.values()].map(({ geometry: g, edges, shape }) => (
        <AreaMesh key={shape.key} areaKey={shape.key} geometry={g} edges={edges} fill={shape.fill} flat={shape.height < 1} interactive={interactive} selected={selected === shape.key} grouped={group?.has(shape.key) ?? false} anySelected={selected !== null} />
      ))}
    </>
  );
}

function AreaMesh({
  areaKey,
  geometry,
  edges,
  fill,
  flat,
  interactive,
  selected,
  grouped,
  anySelected,
}: {
  areaKey: AreaKey;
  geometry: Mesh["geometry"];
  edges: Mesh["geometry"];
  fill: string;
  /** A floor mat: edges only while hovered or selected. */
  flat: boolean;
  interactive: boolean;
  selected: boolean;
  grouped: boolean;
  anySelected: boolean;
}) {
  const hovered = useHovered(areaKey);
  const look: AreaLook = selected ? "selected" : hovered || grouped ? "hover" : anySelected ? "dimmed" : "base";
  const { cap, side } = areaColours(fill, look);
  const ref = useRef<Mesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    m.userData.hit = { kind: "area", key: areaKey };
    if (interactive) m.layers.enable(HIT_LAYER);
    else m.layers.disable(HIT_LAYER);
  }, [areaKey, interactive]);
  return (
    <group>
      {/* ExtrudeGeometry groups: 0 = caps, 1 = sides. */}
      <mesh ref={ref} geometry={geometry} material={[meshMaterial(cap), meshMaterial(side)]} />
      {(!flat || look === "hover" || look === "selected") && <lineSegments geometry={edges} material={lineMaterial(outlineColour(look))} />}
    </group>
  );
}
