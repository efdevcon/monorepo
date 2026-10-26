import type { AreaId } from "./areas";
import type { CategoryId } from "./categories";
import type { LevelId } from "./levels";

/**
 * What the floor legend explains on each floor listed here: one chip per
 * place type, in this order, with the type's theme icon (or a swatch in the
 * footprints' fill while it has none), tapping it shows every footprint of
 * the type on the floor. Only what the map does not make obvious on its own:
 * no washrooms, tea & coffee, elevators, escalators or stairs (Scott,
 * 2026-10-26). A floor without a list here gets the colour legend instead
 * (one swatch chip per category, catalogue.ts), which is Level 3 today.
 */
export type LegendSpec =
  /** One place type: its footprints on the floor, labelled by the catalogue name without its "#" unless `label` says otherwise. */
  | { areaId: AreaId; label?: string }
  /** A whole category (the suites, fourteen ids): every footprint of it on the floor, with the first one's icon. */
  | { category: CategoryId; label: string };

export const FLOOR_LEGENDS: Partial<Record<LevelId, readonly LegendSpec[]>> = {
  L0: [
    { areaId: "cls-stage" },
    { areaId: "cls-hangout-area" },
    { areaId: "registration" },
    { areaId: "badge-pickup" },
    { areaId: "help-desk" },
    { areaId: "cloak-room-lost-and-found", label: "Cloak Room" },
    { areaId: "food-garden" },
    { areaId: "poster-printing-station" },
    { areaId: "poster-display" },
  ],
  L1: [{ category: "suites", label: "Suites" }, { areaId: "speakers-lounge" }, { areaId: "interview-room" }],
  L2: [{ areaId: "lightning-stage" }, { areaId: "workshop", label: "Workshops" }, { category: "suites", label: "Suites" }, { areaId: "baby-care-room" }],
};
