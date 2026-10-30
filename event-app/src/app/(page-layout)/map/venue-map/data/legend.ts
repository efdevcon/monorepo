import type { AreaId } from "./areas";
import type { CategoryId } from "./categories";
import type { LevelId } from "./levels";

/**
 * What the floor legend explains on each floor listed here: one chip per
 * place type, in this order, with the type's theme icon (or a swatch in the
 * footprints' fill while it has none), tapping it shows every footprint of
 * the type on the floor. Only what the map does not make obvious on its own:
 * no washrooms, tea & coffee, elevators, escalators or stairs (Scott,
 * 2026-10-26). Level 3 keeps its Community and Supporters swatches and
 * lists the rest by icon, short (Scott, 2026-10-26). A floor without a list
 * here would get the colour legend instead (one swatch chip per category,
 * catalogue.ts).
 */
export type LegendSpec =
  /** One place type: its footprints on the floor, labelled by the catalogue name without its "#" unless `label` says otherwise. */
  | { areaId: AreaId; label?: string }
  /**
   * A whole legend category (the suites, fourteen ids; Community = the hubs plus the footprints
   * areas.ts moves there by colour): every footprint of it on the floor, with the first one's
   * icon, or with `swatch` a square in the fill most of them use (Community, Supporters).
   */
  | { category: CategoryId; label: string; swatch?: true };

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
  L1: [{ category: "suites", label: "Meeting rooms" }, { areaId: "speakers-lounge" }, { areaId: "interview-room" }],
  L2: [{ areaId: "lightning-stage" }, { areaId: "workshop", label: "Workshops" }, { category: "suites", label: "Meeting rooms" }, { areaId: "baby-care-room" }],
  L3: [
    { areaId: "lotus-stage", label: "Lotus Stages" },
    { areaId: "jasmine-stage" },
    { areaId: "music-stage" },
    { category: "hubs", label: "Community", swatch: true },
    { category: "supporters", label: "Supporters", swatch: true },
    { areaId: "swag-station" },
    { areaId: "game-zone" },
    { areaId: "decompression-zone" },
  ],
};
