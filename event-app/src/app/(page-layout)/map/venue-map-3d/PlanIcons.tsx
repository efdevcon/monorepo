"use client";

import { useLoader, type ThreeEvent } from "@react-three/fiber";
import { SRGBColorSpace, TextureLoader } from "three";
import { PX } from "./isoMath";
import { TAP_SLOP_PX } from "./Blocks";
import type { Area, PlanShape } from "./types";

type PlanIconsProps = {
  shapes: PlanShape[];
  onSelect: (area: Area) => void;
  setHover: (on: boolean) => void;
};

/** Sprite height in world units (blocks are ~0.85 tall). */
const ICON_HEIGHT: Record<PlanShape["kind"], number> = { block: 1.15, mat: 0.95, wall: 0.6, slab: 0 };
const ICON_LIFT = 0.04;

/** The theme icons, standing on the centre of each footprint and always facing the camera. */
export function PlanIcons({ shapes, onSelect, setHover }: PlanIconsProps) {
  return (
    <>
      {shapes
        .filter((s) => s.icon)
        .map((shape) => (
          <PlanIcon key={shape.id} shape={shape} onSelect={onSelect} setHover={setHover} />
        ))}
    </>
  );
}

function PlanIcon({ shape, onSelect, setHover }: { shape: PlanShape; onSelect: (area: Area) => void; setHover: (on: boolean) => void }) {
  const texture = useLoader(TextureLoader, `/maps/devcon-8/icons/${shape.icon}.png`);

  const image = texture.image as { width: number; height: number } | undefined;
  const aspect = image && image.height ? image.width / image.height : 1;
  const h = ICON_HEIGHT[shape.kind];
  const w = h * aspect;
  const [cx, cz] = shape.centroid;
  const y = shape.height * PX + ICON_LIFT + h / 2;

  const handlers = shape.tappable
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (e.delta > TAP_SLOP_PX) return;
          e.stopPropagation();
          onSelect({ id: shape.id, name: shape.name, description: shape.description });
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHover(true);
        },
        onPointerOut: () => setHover(false),
      }
    : {};

  return (
    <sprite position={[cx * PX, y, cz * PX]} scale={[w, h, 1]} {...handlers}>
      {/* map-colorSpace: PNG colours are sRGB; without it the sprites render washed out. */}
      <spriteMaterial map={texture} map-colorSpace={SRGBColorSpace} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}
