"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { SRGBColorSpace, Sprite, TextureLoader, type Intersection, type Raycaster, type Texture } from "three";
import { PX } from "./isoMath";
import { TAP_SLOP_PX } from "./interaction";
import { areaOf, shapeKey } from "./planArea";
import type { Area, PlanShape } from "./types";

type PlanIconsProps = {
  shapes: PlanShape[];
  /** False while every floor is stacked (taps pick a floor instead). */
  interactive: boolean;
  /** Footprint whose icon bobs (selection key, see planArea.ts). */
  selectedId: string | null;
  /** Found group: every member's icon bobs too. */
  highlightedIds: ReadonlySet<string> | null;
  reducedMotion: boolean;
  onSelect: (area: Area) => void;
  setHovered: (id: string | null) => void;
};

/** Alpha threshold (0–255) below which a sprite pixel doesn't count as a hit. */
const ALPHA_HIT = 40;

/**
 * Per-pixel alpha of the icon, sampled once from the loaded image, so hovering
 * and tapping only register on the drawn part of the sprite rather than its
 * whole (often mostly transparent) quad.
 */
function useAlphaMask(texture: Texture) {
  return useMemo(() => {
    const image = texture.image as HTMLImageElement | undefined;
    if (!image || !image.width || typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    return (u: number, v: number) => {
      const x = Math.min(w - 1, Math.max(0, Math.floor(u * w)));
      const y = Math.min(h - 1, Math.max(0, Math.floor((1 - v) * h))); // textures are flipped in Y
      return data[(y * w + x) * 4 + 3];
    };
  }, [texture]);
}

/** Sprite height in world units (blocks are ~0.85 tall). */
const ICON_HEIGHT: Record<PlanShape["kind"], number> = { block: 1.15, mat: 0.95, wall: 0.6, slab: 0 };
const ICON_LIFT = 0.04;
/** Selected icon: a gentle bob so the highlighted footprint reads at a glance (a deep link lands with it selected). */
const BOB_AMPLITUDE = 0.12; // Scott: "a little more verticality" than 0.07
const BOB_PERIOD_S = 1.8;

/** The theme icons, standing on the centre of each footprint and always facing the camera. */
export function PlanIcons({ shapes, interactive, selectedId, highlightedIds, reducedMotion, onSelect, setHovered }: PlanIconsProps) {
  return (
    <>
      {shapes
        .filter((s) => s.icon)
        .map((shape) => (
          <PlanIcon
            key={shape.id}
            shape={shape}
            interactive={interactive}
            bob={!reducedMotion && (shapeKey(shape) === selectedId || (highlightedIds?.has(shapeKey(shape)) ?? false))}
            onSelect={onSelect}
            setHovered={setHovered}
          />
        ))}
    </>
  );
}

function PlanIcon({
  shape,
  interactive,
  bob,
  onSelect,
  setHovered,
}: {
  shape: PlanShape;
  interactive: boolean;
  bob: boolean;
  onSelect: (area: Area) => void;
  setHovered: (id: string | null) => void;
}) {
  const texture = useLoader(TextureLoader, `/maps/devcon-8/icons/${shape.icon}.png`);
  const alphaAt = useAlphaMask(texture);
  const spriteRef = useRef<Sprite>(null);
  const raycast = useCallback(
    (raycaster: Raycaster, intersects: Intersection[]) => {
      const sprite = spriteRef.current;
      if (!sprite) return;
      const hits: Intersection[] = [];
      Sprite.prototype.raycast.call(sprite, raycaster, hits);
      for (const hit of hits) {
        if (!alphaAt || !hit.uv || alphaAt(hit.uv.x, hit.uv.y) >= ALPHA_HIT) intersects.push(hit);
      }
    },
    [alphaAt]
  );

  const image = texture.image as { width: number; height: number } | undefined;
  const aspect = image && image.height ? image.width / image.height : 1;
  const h = ICON_HEIGHT[shape.kind];
  const w = h * aspect;
  const [cx, cz] = shape.centroid;
  const y = shape.height * PX + ICON_LIFT + h / 2;

  // Bob while selected. The canvas renders on demand, so each frame asks for the
  // next; the sine starts at rest so selecting doesn't jump the icon.
  const { invalidate } = useThree();
  const bobStart = useRef<number | null>(null);
  useEffect(() => {
    bobStart.current = bob ? performance.now() : null;
    const sprite = spriteRef.current;
    if (!bob && sprite) {
      sprite.position.y = y;
      invalidate();
    } else if (bob) invalidate();
  }, [bob, y, invalidate]);
  useFrame(() => {
    const sprite = spriteRef.current;
    if (!sprite || bobStart.current === null) return;
    const t = (performance.now() - bobStart.current) / 1000;
    sprite.position.y = y + BOB_AMPLITUDE * Math.sin((t / BOB_PERIOD_S) * Math.PI * 2);
    invalidate();
  });

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
    <sprite ref={spriteRef} position={[cx * PX, y, cz * PX]} scale={[w, h, 1]} raycast={raycast} {...handlers}>
      {/* map-colorSpace: PNG colours are sRGB; without it the sprites render washed out. */}
      <spriteMaterial map={texture} map-colorSpace={SRGBColorSpace} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}
