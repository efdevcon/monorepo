import type { Area, PlanShape } from "./types";

/** Selection / hover key of a plan footprint: layer ids repeat across floors, so scope them by level. */
export const shapeKey = (shape: PlanShape) => `${shape.level}/${shape.id}`;

/** The AreaCard payload for a plan footprint. */
export const areaOf = (shape: PlanShape): Area => ({
  id: shapeKey(shape),
  name: shape.name,
  description: shape.description,
  icon: shape.icon,
  level: shape.level,
});
