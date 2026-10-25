import type { CategoryId } from "./categories";
import type { IconName } from "./icons.generated";

/**
 * Extrusion classes (metres, deliberately taller than life so the blocks read
 * at the fitted zoom; the plan is ~245 m wide). `zone` is a flat mat: hubs,
 * tea & coffee, storage and the elevators sit on the floor like the co-work
 * areas (Scott, 2026-10-25); stages, washrooms and supporter booths stand up.
 */
export type HeightClass = "stage" | "room" | "kiosk" | "zone";

export type AreaSpec = {
  /**
   * Display name. `#` stands for the instance number of a numbered layer
   * (`community-hub-7` → "Hub 7"); without it, numbered copies share the name
   * and collapse into one Find row ("Washroom ×2").
   */
  name: string;
  description: string;
  category: CategoryId;
  heightClass: HeightClass;
  /** Theme sprite (public/maps/devcon-8/icons/<name>.png) standing on the footprint. */
  icon?: IconName;
  /** Footprints narrower than this (metres) are widened about their centre at build time (the plan draws some stands as thin strips). */
  minWidth?: number;
  /** Schedule room ids (Pretalx) whose sessions happen here: drives "Show on Map" and the live-session card. */
  roomIds?: readonly string[];
};

/**
 * Every tappable layer of the plan SVGs, keyed by area id: the layer name
 * minus its instance number (`starter-12` → `starter`, instance 12). The
 * single source of names, descriptions, categories, heights, icons and
 * schedule rooms; the build (scripts/map-build) fails on a layer with no
 * entry here and on an entry no layer uses, so the two never drift.
 *
 * Descriptions are placeholders until the programme team writes them.
 */
export const AREAS = {
  // Stages
  "lotus-stage": { name: "Lotus Stage #", description: "Talks and panels.", category: "stages", heightClass: "stage" },
  "jasmine-stage": { name: "Jasmine Stage #", description: "Talks and panels.", category: "stages", heightClass: "stage" },
  "music-stage": { name: "Music Stage", description: "Live music through the day.", category: "stages", heightClass: "stage" },
  // Community hubs
  "community-hub": { name: "Hub #", description: "A community hub booth.", category: "hubs", heightClass: "zone", icon: "community-hub" },
  // Supporter booths
  "flagship-supporter": { name: "Flagship Supporter F#", description: "Supporter booth.", category: "supporters", heightClass: "kiosk" },
  "core-supporter": { name: "Core Supporter C#", description: "Supporter booth.", category: "supporters", heightClass: "kiosk" },
  starter: { name: "Starter Supporter S#", description: "Supporter booth.", category: "supporters", heightClass: "kiosk" },
  // Food & drink
  "tea-coffee": { name: "Tea & Coffee", description: "Hot drinks all day.", category: "food", heightClass: "zone", icon: "coffee", minWidth: 2.5 },
  // Washrooms
  washroom: { name: "Washroom", description: "", category: "toilets", heightClass: "room", icon: "toilets" },
  // Cowork & discussion
  "co-work-area": { name: "Co-work Area", description: "Desks, power and wifi.", category: "cowork", heightClass: "zone", icon: "cowork" },
  "quiet-co-work": { name: "Quiet Co-work", description: "Heads-down desks, keep it quiet.", category: "cowork", heightClass: "zone", icon: "cowork" },
  "blue-discussion-corner": { name: "Blue Discussion Corner", description: "Open discussions, drop in.", category: "cowork", heightClass: "zone", icon: "discussion-corner" },
  "pink-discussion-corner": { name: "Pink Discussion Corner", description: "Open discussions, drop in.", category: "cowork", heightClass: "zone", icon: "discussion-corner" },
  // Check-in & swag
  "swag-station": { name: "Swag Station", description: "Collect your swag with your ticket.", category: "checkin", heightClass: "kiosk", icon: "swag-station" },
  // Fun & rest
  "decompression-zone": { name: "Decompression Zone", description: "Slow down and rest.", category: "fun", heightClass: "zone", icon: "decompression" },
  "game-zone": { name: "Game Zone", description: "Games between sessions.", category: "fun", heightClass: "zone", icon: "playground" },
  "art-gallery": { name: "Art Gallery", description: "Art from the community.", category: "fun", heightClass: "zone" },
  "poster-display": { name: "Poster Display", description: "Research posters.", category: "fun", heightClass: "zone" },
  "content-corner": { name: "Content Corner", description: "Interviews and recordings.", category: "fun", heightClass: "zone", icon: "press" },
  "open-hardware-zone": { name: "Open Hardware Zone", description: "Open hardware, hands on.", category: "fun", heightClass: "zone" },
  // Other
  elevator: { name: "Elevators", description: "", category: "other", heightClass: "zone" },
  "storage-room": { name: "Storage", description: "Staff only.", category: "other", heightClass: "zone" },
} as const satisfies Record<string, AreaSpec>;

export type AreaId = keyof typeof AREAS;
export const isAreaId = (id: string): id is AreaId => Object.prototype.hasOwnProperty.call(AREAS, id);

/**
 * Schedule rooms whose sessions happen on a footprint. Per area id and
 * instance: the Pretalx room ids of Devcon 8 (`GET /events/devcon8/rooms`).
 * The Main Stage is the three Lotus halls opened into one, so its room maps
 * to all three footprints.
 */
export const ROOMS: Record<string, readonly { areaId: AreaId; instance?: number }[]> = {
  "lotus-stage-1": [{ areaId: "lotus-stage", instance: 1 }],
  "lotus-stage-2": [{ areaId: "lotus-stage", instance: 2 }],
  "lotus-stage-3": [{ areaId: "lotus-stage", instance: 3 }],
  "main-stage-lotus": [
    { areaId: "lotus-stage", instance: 1 },
    { areaId: "lotus-stage", instance: 2 },
    { areaId: "lotus-stage", instance: 3 },
  ],
  "jasmine-stage-4": [{ areaId: "jasmine-stage", instance: 4 }],
  "music-stage": [{ areaId: "music-stage" }],
};
