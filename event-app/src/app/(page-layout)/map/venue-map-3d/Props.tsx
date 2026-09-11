"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { DoubleSide, Quaternion, Vector3, type Group } from "three";
import { billboardMatrix, groundFromScreen, INITIAL_AZIMUTH, POLAR_ANGLE } from "./isoMath";
import { getLayerParts } from "./svgLayer";
import { LAYER_STEP } from "./Slab";
import { TAP_SLOP_PX } from "./interaction";
import type { Area, CameraPose, SceneProp } from "./types";

type PropsProps = {
  props: SceneProp[];
  areaByProp: Map<string, Area>;
  poseRef: MutableRefObject<CameraPose>;
  hoveredId: string | null;
  onSelect: (area: Area) => void;
  setHovered: (id: string | null) => void;
};

const Y_AXIS = new Vector3(0, 1, 0);
/** Axis that pitches the decal plane from the isometric view direction towards straight up (screen-left at the start view). */
const TILT_AXIS = new Vector3(-1, 0, 1).normalize();
const yawQ = new Quaternion();
const tiltQ = new Quaternion();

/**
 * Icons, people and room decals stand on the floor as paper cut-outs facing
 * the camera. At the start view they land exactly where the artwork drew
 * them; when the floor turns they pivot around their base to keep facing the
 * viewer, like sprites in an isometric game, and when the camera pitches
 * towards top-down they lean back with it so they never turn edge-on.
 */
export function Props({ props, areaByProp, poseRef, hoveredId, onSelect, setHovered }: PropsProps) {
  return (
    <>
      {props.map((prop) => (
        <Prop
          key={prop.id}
          prop={prop}
          area={areaByProp.get(prop.id)}
          poseRef={poseRef}
          hovered={hoveredId === (areaByProp.get(prop.id)?.id ?? null)}
          onSelect={onSelect}
          setHovered={setHovered}
        />
      ))}
    </>
  );
}

function Prop({
  prop,
  area,
  poseRef,
  hovered,
  onSelect,
  setHovered,
}: {
  prop: SceneProp;
  area: Area | undefined;
  poseRef: MutableRefObject<CameraPose>;
  hovered: boolean;
  onSelect: (area: Area) => void;
  setHovered: (id: string | null) => void;
}) {
  const parts = getLayerParts(`prop:${prop.id}`, prop.svg);
  const [x, z] = groundFromScreen(prop.anchor[0], prop.anchor[1]);
  const matrix = useMemo(() => billboardMatrix(prop.anchor[0], prop.anchor[1]), [prop.anchor]);
  const pivot = useRef<Group>(null);

  useFrame(() => {
    if (!pivot.current) return;
    const { azimuth, polar } = poseRef.current;
    yawQ.setFromAxisAngle(Y_AXIS, azimuth - INITIAL_AZIMUTH);
    tiltQ.setFromAxisAngle(TILT_AXIS, POLAR_ANGLE - polar);
    pivot.current.quaternion.copy(yawQ).multiply(tiltQ);
    // Hover: grow a touch around the base.
    const s = hovered ? 1.08 : 1;
    pivot.current.scale.setScalar(s);
  });

  const [bx, by, bw, bh] = prop.bbox;
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
          setHovered(area.id);
        },
        onPointerOut: () => setHovered(null),
      }
    : {};

  return (
    <group ref={pivot} position={[x, 0, z]} {...handlers}>
      <group matrix={matrix} matrixAutoUpdate={false}>
        {parts.map((part) => (
          <mesh key={part.order} geometry={part.geometry} position-z={part.order * LAYER_STEP}>
            <meshBasicMaterial
              color={part.color}
              transparent={part.opacity < 1}
              opacity={part.opacity}
              depthWrite={part.opacity >= 1}
              side={DoubleSide}
              toneMapped={false}
            />
          </mesh>
        ))}
        {area && (
          // Invisible hit plane behind the decal so thin strokes and gaps still register; kept to the drawn bbox.
          <mesh position={[bx + bw / 2, by + bh / 2, -0.002]}>
            <planeGeometry args={[Math.max(bw, 28), Math.max(bh, 28)]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
      </group>
    </group>
  );
}
