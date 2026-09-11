"use client";

import { DoubleSide } from "three";
import { GROUND_MATRIX } from "./isoMath";
import { getLayerParts } from "./svgLayer";
import type { SceneData } from "./types";

/** World-y step between consecutive colour groups so coplanar fills don't z-fight. */
export const LAYER_STEP = 0.0003;

/** The flat floor artwork (Base-Layer minus the 3D blocks, plus the floor mats), un-projected onto the ground. */
export function Slab({ scene }: { scene: SceneData }) {
  const parts = getLayerParts("slab", scene.slabSvg);
  return (
    <group matrix={GROUND_MATRIX} matrixAutoUpdate={false}>
      {parts.map((part) => (
        <mesh key={part.order} geometry={part.geometry} position-z={part.order * LAYER_STEP}>
          <meshBasicMaterial
            color={part.color}
            transparent={part.opacity < 1}
            opacity={part.opacity}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
