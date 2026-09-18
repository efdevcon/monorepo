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

/**
 * Another footprint on the floor is selected: this one fades towards the slab
 * (PlanShapes) and its icon with it (PlanIcons). One predicate for both, so a
 * hover un-dims the footprint and its icon together.
 */
export const isDimmed = (shape: PlanShape, selectedId: string | null, hoveredId: string | null, highlightedIds: ReadonlySet<string> | null): boolean => {
  if (selectedId === null || !shape.tappable) return false;
  const key = shapeKey(shape);
  return key !== selectedId && key !== hoveredId && !(highlightedIds?.has(key) ?? false);
};
