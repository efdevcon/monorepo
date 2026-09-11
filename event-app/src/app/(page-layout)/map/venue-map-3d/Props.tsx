"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { DoubleSide, type Group } from "three";
import { billboardMatrix, groundFromScreen, INITIAL_AZIMUTH } from "./isoMath";
import { getLayerParts } from "./svgLayer";
import { LAYER_STEP } from "./Slab";
import { TAP_SLOP_PX } from "./Blocks";
import type { Area, SceneProp } from "./types";

type PropsProps = {
  props: SceneProp[];
  areaByProp: Map<string, Area>;
  azimuthRef: MutableRefObject<number>;
  onSelect: (area: Area) => void;
  setHover: (on: boolean) => void;
};

/**
 * Icons, people and room decals stand upright on the floor as paper cut-outs
 * facing the camera. At the start view they land exactly where the artwork
 * drew them; when the floor turns they pivot around their base to keep facing
 * the viewer, like sprites in an isometric game.
 */
export function Props({ props, areaByProp, azimuthRef, onSelect, setHover }: PropsProps) {
  return (
    <>
      {props.map((prop) => (
        <Prop
          key={prop.id}
          prop={prop}
          area={areaByProp.get(prop.id)}
          azimuthRef={azimuthRef}
          onSelect={onSelect}
          setHover={setHover}
        />
      ))}
    </>
  );
}

function Prop({
  prop,
  area,
  azimuthRef,
  onSelect,
  setHover,
}: {
  prop: SceneProp;
  area: Area | undefined;
  azimuthRef: MutableRefObject<number>;
  onSelect: (area: Area) => void;
  setHover: (on: boolean) => void;
}) {
  const parts = getLayerParts(`prop:${prop.id}`, prop.svg);
  const [x, z] = groundFromScreen(prop.anchor[0], prop.anchor[1]);
  const matrix = useMemo(() => billboardMatrix(prop.anchor[0], prop.anchor[1]), [prop.anchor]);
  const pivot = useRef<Group>(null);

  useFrame(() => {
    if (pivot.current) pivot.current.rotation.y = azimuthRef.current - INITIAL_AZIMUTH;
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
          setHover(true);
        },
        onPointerOut: () => setHover(false),
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
          // Generous invisible hit area behind the decal, so small icons are tappable.
          <mesh position={[bx + bw / 2, by + bh / 2, -0.002]}>
            <planeGeometry args={[Math.max(bw, 40), Math.max(bh, 40)]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
      </group>
    </group>
  );
}
