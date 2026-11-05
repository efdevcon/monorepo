import type { LevelId } from "./levels";

/**
 * Images painted flat on a floor's slab that are not places: no footprint,
 * no card, no hit, nothing in Find or Search. Positions are plan metres
 * (the catalogue's X/Z), `width` the image's width in metres; the image is
 * upright from the start view (the south-east), like a booth decal.
 */
export type FloorDecal = {
  id: string;
  level: LevelId;
  /** Under public/. */
  image: string;
  x: number;
  z: number;
  width: number;
};

export const FLOOR_DECALS: readonly FloorDecal[] = [
  // ETHGlobal's sub-event runs in the walled hall east of the CLS stage on Level 0 (x 108–244 m, z −3–70 m): the
  // lockup sits in the hall's middle, small enough to mark the room without reading as a place (Scott, 2026-11-05).
  { id: "ethglobal", level: "L0", image: "/maps/jwcc/decals/ethglobal.svg", x: 176, z: 33.5, width: 36 },
];

export const decalsOnLevel = (level: LevelId) => FLOOR_DECALS.filter((d) => d.level === level);
