"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { SRGBColorSpace, Sprite, TextureLoader, type Intersection, type Raycaster, type Texture } from "three";
import type { LevelId } from "../data/levels";
import { areasOnLevel, type Area, type AreaKey } from "../data/resolve";
import { HIT_LAYER } from "../interaction/pointer";
import { useHovered } from "../interaction/hoverStore";

/** Alpha (0–255) below which a sprite pixel doesn't count as a hit. */
const ALPHA_HIT = 40;
/** Sprite height in metres: from the footprint's shorter side, clamped so a booth's icon stays legible and a hall's stays modest. */
const ICON_MIN_M = 3;
const ICON_MAX_M = 11;
const ICON_SCALE = 1.4;
const ICON_LIFT = 0.2;
/** Selected icon: a gentle bob so the highlighted footprint reads at a glance. */
const BOB_AMPLITUDE = 0.6;
const BOB_PERIOD_S = 1.8;
const DIM_OPACITY = 0.35;

type AreaIconsProps = {
  level: LevelId;
  interactive: boolean;
  selected: AreaKey | null;
  group: ReadonlySet<AreaKey> | null;
  reducedMotion: boolean;
};

/** The theme sprites standing on the footprints that have one, always facing the camera. */
export function AreaIcons({ level, interactive, selected, group, reducedMotion }: AreaIconsProps) {
  const areas = useMemo(() => areasOnLevel(level).filter((a) => a.iconUrl), [level]);
  return (
    <Suspense fallback={null}>
      {areas.map((area) => (
        <AreaIcon key={area.key} area={area} interactive={interactive} bob={!reducedMotion && (selected === area.key || (group?.has(area.key) ?? false))} dim={selected !== null && selected !== area.key && !(group?.has(area.key) ?? false)} />
      ))}
    </Suspense>
  );
}

/** Per-pixel alpha of the icon, sampled once, so hovers and taps only register on the drawn part of the quad. */
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
    return (u: number, v: number) => data[(Math.min(h - 1, Math.max(0, Math.floor((1 - v) * h))) * w + Math.min(w - 1, Math.max(0, Math.floor(u * w)))) * 4 + 3];
  }, [texture]);
}

function AreaIcon({ area, interactive, bob, dim }: { area: Area; interactive: boolean; bob: boolean; dim: boolean }) {
  const texture = useLoader(TextureLoader, area.iconUrl!);
  const alphaAt = useAlphaMask(texture);
  const ref = useRef<Sprite>(null);
  const hovered = useHovered(area.key);
  const raycast = useCallback(
    (raycaster: Raycaster, intersects: Intersection[]) => {
      const sprite = ref.current;
      if (!sprite) return;
      const hits: Intersection[] = [];
      Sprite.prototype.raycast.call(sprite, raycaster, hits);
      for (const hit of hits) if (!alphaAt || !hit.uv || alphaAt(hit.uv.x, hit.uv.y) >= ALPHA_HIT) intersects.push(hit);
    },
    [alphaAt]
  );
  const image = texture.image as { width: number; height: number } | undefined;
  const aspect = image && image.height ? image.width / image.height : 1;
  const [minX, minZ, maxX, maxZ] = area.shape.bbox;
  const h = Math.min(ICON_MAX_M, Math.max(ICON_MIN_M, Math.min(maxX - minX, maxZ - minZ) * ICON_SCALE));
  const w = h * aspect;
  const [cx, cz] = area.shape.anchor;
  const y = area.shape.height + ICON_LIFT + h / 2;

  useEffect(() => {
    const s = ref.current;
    if (!s) return;
    s.userData.hit = { kind: "area", key: area.key };
    if (interactive) s.layers.enable(HIT_LAYER);
    else s.layers.disable(HIT_LAYER);
  }, [area.key, interactive]);

  // Bob while selected: the sine starts at rest so selecting doesn't jump the icon; on-demand frames.
  const { invalidate } = useThree();
  const bobStart = useRef<number | null>(null);
  useEffect(() => {
    bobStart.current = bob ? performance.now() : null;
    const s = ref.current;
    if (!bob && s) s.position.y = y;
    invalidate();
  }, [bob, y, invalidate]);
  useFrame(() => {
    const s = ref.current;
    if (!s || bobStart.current === null) return;
    const t = (performance.now() - bobStart.current) / 1000;
    s.position.y = y + BOB_AMPLITUDE * Math.sin((t / BOB_PERIOD_S) * Math.PI * 2);
    invalidate();
  });

  return (
    <sprite ref={ref} position={[cx, y, cz]} scale={[w, h, 1]} raycast={raycast}>
      {/* PNG colours are sRGB; without the colour space the sprites render washed out. */}
      <spriteMaterial map={texture} map-colorSpace={SRGBColorSpace} transparent opacity={dim && !hovered ? DIM_OPACITY : 1} depthWrite={false} toneMapped={false} />
    </sprite>
  );
}
