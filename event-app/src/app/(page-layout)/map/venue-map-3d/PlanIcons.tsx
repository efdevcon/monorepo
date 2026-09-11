"use client";

import { useLoader } from "@react-three/fiber";
import { SRGBColorSpace, TextureLoader } from "three";
import { PX } from "./isoMath";
import type { PlanShape } from "./types";

/** Sprite height in world units (blocks are ~0.85 tall). */
const ICON_HEIGHT: Record<PlanShape["kind"], number> = { block: 1.15, mat: 0.95, wall: 0.6, slab: 0 };
const ICON_LIFT = 0.04;
/** Icons are decoration: the footprint underneath is the tap target, so hits line up with the drawn geometry. */
const noRaycast = () => null;

/** The theme icons, standing on the centre of each footprint and always facing the camera. */
export function PlanIcons({ shapes }: { shapes: PlanShape[] }) {
  return (
    <>
      {shapes
        .filter((s) => s.icon)
        .map((shape) => (
          <PlanIcon key={shape.id} shape={shape} />
        ))}
    </>
  );
}

function PlanIcon({ shape }: { shape: PlanShape }) {
  const texture = useLoader(TextureLoader, `/maps/devcon-8/icons/${shape.icon}.png`);
  const image = texture.image as { width: number; height: number } | undefined;
  const aspect = image && image.height ? image.width / image.height : 1;
  const h = ICON_HEIGHT[shape.kind];
  const w = h * aspect;
  const [cx, cz] = shape.centroid;
  const y = shape.height * PX + ICON_LIFT + h / 2;

  return (
    <sprite position={[cx * PX, y, cz * PX]} scale={[w, h, 1]} raycast={noRaycast}>
      {/* map-colorSpace: PNG colours are sRGB; without it the sprites render washed out. */}
      <spriteMaterial map={texture} map-colorSpace={SRGBColorSpace} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}
