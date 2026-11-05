"use client";

import type { LevelId } from "../data/levels";
import { decalsOnLevel, type FloorDecal } from "../data/decals";
import { useSpriteImage } from "./spriteImage";

/** Above the slab's top (y = 0), clear of z-fighting; the booth decals use the same. */
const DECAL_LIFT = 0.03;
/** Dimmed like the other icons while a place is selected. */
const DIM_OPACITY = 0.35;
/** A floor decal spans tens of metres, so its canvas is four times the sprites' 256 px. */
const DECAL_CANVAS_PX = 1024;

/** The floor's decals (`data/decals.ts`): flat images on the slab, off the hit layer, never selectable. */
export function FloorDecals({ level, dim }: { level: LevelId; dim: boolean }) {
  return (
    <>
      {decalsOnLevel(level).map((decal) => (
        <Decal key={decal.id} decal={decal} dim={dim} />
      ))}
    </>
  );
}

function Decal({ decal, dim }: { decal: FloorDecal; dim: boolean }) {
  const image = useSpriteImage(decal.image, DECAL_CANVAS_PX);
  if (!image) return null;
  const w = decal.width;
  const h = w / image.aspect;
  return (
    <mesh position={[decal.x, DECAL_LIFT, decal.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={image.texture} transparent opacity={dim ? DIM_OPACITY : 1} depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}
