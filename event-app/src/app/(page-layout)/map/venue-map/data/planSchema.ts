import { z } from "zod";
import { LEVEL_ORDER } from "./levels";

/**
 * The bundle scripts/map-build writes to plan.generated.json: geometry only,
 * in metres on the ground plane (plan x → X, plan y → Z, y up). Prose, icons
 * and categories come from areas.ts at runtime (resolve.ts). Validated on
 * write and on import.
 */
const point = z.tuple([z.number(), z.number()]);
const ring = z.array(point).min(3);

export const shapeKindSchema = z.enum(["slab", "wall", "area", "deco"]);
export type ShapeKind = z.infer<typeof shapeKindSchema>;

export const mapShapeSchema = z.object({
  /** `${level}/${id}`, unique across the bundle. */
  key: z.string().min(1),
  /** Layer id after normalisation (`tea-coffee-7`, `wall-3`); unique within a level. */
  id: z.string().min(1),
  level: z.enum(LEVEL_ORDER as [string, ...string[]]),
  kind: shapeKindSchema,
  /** Catalogue key (`tea-coffee`) and instance number (7), areas only. */
  areaId: z.string().optional(),
  instance: z.number().int().optional(),
  polygons: z.array(z.object({ outer: ring, holes: z.array(ring) })).min(1),
  /** Pole of inaccessibility of the largest polygon: where a sprite stands. */
  anchor: point,
  /** [minX, minZ, maxX, maxZ]. */
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  /** Extrusion height in metres; the slab extrudes downwards by it. */
  height: z.number(),
  /** Metres above the floor the extrusion starts: a zone drawn inside another zone stands on it (absent = 0). */
  base: z.number().optional(),
  fill: z.string(),
  /** Edge lines drawn on the extrusion. */
  outline: z.boolean(),
  /** Not drawn: only the sprite stands here (the plan's escalator drawings, replaced by their icon). */
  hidden: z.boolean().optional(),
});
export type MapShape = z.infer<typeof mapShapeSchema>;

export const boundsSchema = z.object({ minX: z.number(), minZ: z.number(), maxX: z.number(), maxZ: z.number() });
export type GroundBounds = z.infer<typeof boundsSchema>;

export const mapLevelSchema = z.object({
  id: z.enum(LEVEL_ORDER as [string, ...string[]]),
  label: z.string(),
  name: z.string(),
  bounds: boundsSchema,
  shapes: z.array(mapShapeSchema),
});
export type MapLevel = z.infer<typeof mapLevelSchema>;

export const mapBundleSchema = z.object({
  version: z.literal(2),
  units: z.object({ metresPerPlanPx: z.number().positive(), viewBox: z.tuple([z.number(), z.number(), z.number(), z.number()]) }),
  /** Union of every floor's footprint. */
  bounds: boundsSchema,
  levels: z.array(mapLevelSchema).min(1),
});
export type MapBundle = z.infer<typeof mapBundleSchema>;
