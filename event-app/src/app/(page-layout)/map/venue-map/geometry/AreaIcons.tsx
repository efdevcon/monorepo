"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sprite, type Intersection, type Raycaster } from "three";
import type { LevelId } from "../data/levels";
import { areasOnLevel, type Area, type AreaKey } from "../data/resolve";
import { HIT_LAYER } from "../interaction/pointer";
import { useHovered } from "../interaction/hoverStore";
import { ALPHA_HIT, useSpriteImage } from "./spriteImage";

/** Sprite height in metres: from the footprint's shorter side, clamped so a booth's icon stays legible and a hall's stays modest (smaller since 2026-10-25, Scott: too big on some places). */
const ICON_MIN_M = 2.4;
const ICON_MAX_M = 6.5;
const ICON_SCALE = 0.9;
const ICON_LIFT = 0.2;
const ICON_WIDTH_CAP = 1.15;
const ICON_MIN_W_M = 1.2;
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

/** The sprites standing on the footprints that have one (theme icons, hub marks), always facing the camera. */
export function AreaIcons({ level, interactive, selected, group, reducedMotion }: AreaIconsProps) {
  const areas = useMemo(() => areasOnLevel(level).filter((a) => a.iconUrl), [level]);
  return (
    <>
      {areas.map((area) => (
        <AreaIcon key={area.key} area={area} interactive={interactive} bob={!reducedMotion && (selected === area.key || (group?.has(area.key) ?? false))} dim={selected !== null && selected !== area.key && !(group?.has(area.key) ?? false)} />
      ))}
    </>
  );
}

function AreaIcon({ area, interactive, bob, dim }: { area: Area; interactive: boolean; bob: boolean; dim: boolean }) {
  const image = useSpriteImage(area.iconUrl!);
  const ref = useRef<Sprite>(null);
  const hovered = useHovered(area.key);
  const raycast = useCallback(
    (raycaster: Raycaster, intersects: Intersection[]) => {
      const sprite = ref.current;
      if (!sprite || !image) return;
      const hits: Intersection[] = [];
      Sprite.prototype.raycast.call(sprite, raycaster, hits);
      for (const hit of hits) if (!hit.uv || image.alphaAt(hit.uv.x, hit.uv.y) >= ALPHA_HIT) intersects.push(hit);
    },
    [image]
  );
  const [minX, minZ, maxX, maxZ] = area.shape.bbox;
  let h = area.iconSize ?? Math.min(ICON_MAX_M, Math.max(ICON_MIN_M, Math.min(maxX - minX, maxZ - minZ) * ICON_SCALE));
  let w = h * (image?.aspect ?? 1);
  // A wide lockup may not overhang its booth by much: cap the width at the footprint's longer side (plus a little), never thinner than ICON_MIN_W_M.
  const maxW = Math.max(maxX - minX, maxZ - minZ) * ICON_WIDTH_CAP;
  if (!area.iconSize && w > maxW) {
    h = Math.max(ICON_MIN_W_M, h * (maxW / w));
    w = h * (image?.aspect ?? 1);
  }
  const [cx, cz] = area.shape.anchor;
  const y = (area.shape.base ?? 0) + area.shape.height + ICON_LIFT + h / 2;

  useEffect(() => {
    const s = ref.current;
    if (!s) return;
    s.userData.hit = { kind: "area", key: area.key };
    if (interactive) s.layers.enable(HIT_LAYER);
    else s.layers.disable(HIT_LAYER);
  }, [area.key, interactive, image]);

  // Bob while selected: the sine starts at rest so selecting doesn't jump the icon; on-demand frames.
  const { invalidate } = useThree();
  const bobStart = useRef<number | null>(null);
  useEffect(() => {
    bobStart.current = bob ? performance.now() : null;
    const s = ref.current;
    if (!bob && s) s.position.y = y;
    invalidate();
  }, [bob, y, invalidate, image]);
  useFrame(() => {
    const s = ref.current;
    if (!s || bobStart.current === null) return;
    const t = (performance.now() - bobStart.current) / 1000;
    s.position.y = y + BOB_AMPLITUDE * Math.sin((t / BOB_PERIOD_S) * Math.PI * 2);
    invalidate();
  });

  if (!image) return null;
  return (
    <sprite ref={ref} position={[cx, y, cz]} scale={[w, h, 1]} raycast={raycast}>
      <spriteMaterial map={image.texture} transparent opacity={dim && !hovered ? DIM_OPACITY : 1} depthWrite={false} toneMapped={false} />
    </sprite>
  );
}
