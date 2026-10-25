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
  /** The legend chip the footprint belongs to when it is not its category's (the yellow discussion corners sit under Community, with the hubs). */
  legend?: CategoryId;
  heightClass: HeightClass;
  /** Theme sprite (public/maps/devcon-8/icons/<name>.png) standing on the footprint. */
  icon?: IconName;
  /** Footprints narrower than this (metres) are widened about their centre at build time (the plan draws some stands as thin strips). */
  minWidth?: number;
  /** Sprite height in metres, instead of the size derived from the footprint (the escalators are long and thin). */
  iconSize?: number;
  /** Per instance number: a different sprite (the elevator on the east side faces the other way). */
  icons?: Readonly<Record<number, IconName>>;
  /** Schedule room ids (Pretalx) whose sessions happen here: drives "Show on Map" and the live-session card. */
  roomIds?: readonly string[];
  /** Per instance number: the Community Hub (src/data/communityHubs.ts id) at that booth. Its mark becomes the sprite, its name and description the card's. */
  hubs?: Readonly<Record<number, string>>;
  /** Per instance number: who is at that booth (supporters). The logo becomes the sprite, the name the card's; the plan's booth name stays as the booth line. */
  tenants?: Readonly<Record<number, Tenant>>;
  /** Position in Find and Search lists within the category (lower first, then by name; unset = 100). */
  rank?: number;
};

/** A supporter at a booth. `logo` is a path under public/ (white lockups today, on the booth's fill colour in the card). */
export type Tenant = { name: string; logo: string };

const supporter = (name: string, file: string): Tenant => ({ name, logo: `/maps/jwcc/supporters/${file}.svg` });

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
  "lotus-stage": { name: "Lotus Stage #", description: "Talks and panels.", category: "stages", heightClass: "stage", rank: 10, icon: "lotus" },
  "jasmine-stage": { name: "Jasmine Stage #", description: "Talks and panels.", category: "stages", heightClass: "stage", rank: 20, icon: "jasmine" },
  "music-stage": { name: "Music Stage", description: "Live music through the day.", category: "stages", heightClass: "stage", rank: 30, icon: "music-stage" },
  // Community hubs
  "community-hub": {
    name: "Hub #",
    description: "A community hub booth.",
    category: "hubs",
    heightClass: "zone",
    icon: "community-hub",
    // Booth numbers from the JWCC floor plan (Scott, 2026-10-25). 5 and 6 were not on the plan
    // excerpts: the two hubs left over are placed there provisionally (confirm with Scott).
    hubs: {
      1: "india",
      2: "zuzone",
      3: "eip",
      4: "p2p-networking",
      5: "agentic",
      6: "legal-governance",
      7: "privacy",
      8: "security",
      9: "resilient-networking",
      10: "aggregation",
      11: "prediction-markets",
      12: "open-source",
      13: "onchain-art",
      14: "desci",
    },
  },
  // Supporter booths
  // Booth assignments from the JWCC floor plan (Scott, 2026-10-25). Logos: the website's white
  // supporter set, as a test (colour versions may follow). Shared booths show the first name.
  "flagship-supporter": {
    name: "Flagship Supporter F#",
    description: "Supporter booth.",
    category: "supporters",
    heightClass: "kiosk",
    tenants: { 1: supporter("Fluid", "fluid"), 2: supporter("Base", "base") },
  },
  "core-supporter": {
    name: "Core Supporter C#",
    description: "Supporter booth.",
    category: "supporters",
    heightClass: "kiosk",
    tenants: { 1: supporter("Gnosis", "gnosis"), 2: supporter("Kleros", "kleros"), 3: supporter("Golem", "golem"), 4: supporter("OpenZeppelin", "openzeppelin") },
  },
  starter: {
    name: "Starter Supporter S#",
    description: "Supporter booth.",
    category: "supporters",
    heightClass: "kiosk",
    tenants: {
      1: supporter("ENS / Virtuals", "ens"),
      2: supporter("Ordocode", "ordocode"),
      3: supporter("Nethermind", "nethermind"),
      // 4: Bitget Wallet (no logo in the set yet)
      5: supporter("World / ZKP2P", "world"),
      6: supporter("Trail of Bits / Fair Food Data", "trail-of-bits"),
      7: supporter("Swarm", "swarm"),
      8: supporter("LFDT", "lfdt"),
      9: supporter("EEZ", "eez"),
      10: supporter("Crossbar", "crossbar"),
      11: supporter("UNICEF", "unicef"),
      12: supporter("Kohaku / Money League", "kohaku"),
      13: supporter("EAG", "eag"),
      14: supporter("EIPsInsight / DAO Fund", "eipsinsight"),
      15: supporter("growthepie", "growthepie"),
      16: supporter("GCC Commons / ZisK", "gcc"),
      17: supporter("ETH Labs", "eth-labs"),
      18: supporter("Railgun", "railgun"),
      19: supporter("Walletbeat", "walletbeat"),
      20: supporter("Nimbus", "nimbus"),
      21: supporter("GrapheneOS / Gainforest", "grapheneos"),
    },
  },
  // Food & drink
  "tea-coffee": { name: "Tea & Coffee", description: "Hot drinks all day.", category: "food", heightClass: "zone", icon: "coffee", minWidth: 2.5 },
  // Washrooms
  washroom: { name: "Washroom", description: "", category: "toilets", heightClass: "room", icon: "toilets" },
  // Cowork & discussion
  "co-work-area": { name: "Co-work Area", description: "Desks, power and wifi.", category: "cowork", heightClass: "zone", icon: "cowork" },
  "quiet-co-work": { name: "Quiet Co-work", description: "Heads-down desks, keep it quiet.", category: "cowork", heightClass: "zone", icon: "cowork" },
  "blue-discussion-corner": { name: "Blue Discussion Corner", description: "Open discussions, drop in.", category: "cowork", legend: "hubs", heightClass: "zone", icon: "discussion-corner" },
  "pink-discussion-corner": { name: "Pink Discussion Corner", description: "Open discussions, drop in.", category: "cowork", legend: "hubs", heightClass: "zone", icon: "discussion-corner" },
  // Check-in & swag
  "swag-station": { name: "Swag Station", description: "Collect your swag with your ticket.", category: "checkin", heightClass: "kiosk", icon: "swag-station" },
  // Fun & rest
  "decompression-zone": { name: "Decompression Zone", description: "Slow down and rest.", category: "cowork", heightClass: "zone", icon: "decompression" },
  "game-zone": { name: "Game Zone", description: "Games between sessions.", category: "fun", heightClass: "zone", icon: "playground" },
  "art-gallery": { name: "Art Gallery", description: "Art from the community.", category: "fun", heightClass: "zone", icon: "art-gallery" },
  "poster-display": { name: "Poster Display", description: "Research posters.", category: "fun", heightClass: "zone", icon: "poster-display" },
  "content-corner": { name: "Content Corner", description: "Interviews and recordings.", category: "fun", heightClass: "zone", icon: "press" },
  "open-hardware-zone": { name: "Open Hardware Zone", description: "Open hardware, hands on.", category: "fun", legend: "hubs", heightClass: "zone", icon: "open-hardware-zone" },
  // Other
  elevator: { name: "Elevators", description: "", category: "other", heightClass: "zone", icon: "elevator-right", icons: { 8: "elevator-left" }, iconSize: 6.5 },
  // Named Outline groups: the plan's escalator drawings are replaced by the sprite (hidden footprint, see build).
  escalator: { name: "Escalator", description: "", category: "other", heightClass: "zone", icon: "escalator-right", iconSize: 6.5 },
  "storage-room": { name: "Storage", description: "Staff only.", category: "other", heightClass: "zone", icon: "storage" },
} as const satisfies Record<string, AreaSpec>;

export type AreaId = keyof typeof AREAS;
export const isAreaId = (id: string): id is AreaId => Object.prototype.hasOwnProperty.call(AREAS, id);

/**
 * Find rows that stand for several footprints at once: the Main Stage is the
 * three Lotus halls opened into one, so its row highlights all three (and
 * the card is titled after it). Members are catalogue ids + instances.
 */
export type Composite = { id: string; name: string; description: string; category: CategoryId; rank?: number; members: readonly { areaId: AreaId; instance?: number }[] };
export const COMPOSITES: readonly Composite[] = [
  {
    id: "main-stage",
    name: "Main Stage",
    description: "Opening and closing ceremonies, keynotes: the three Lotus halls opened into one.",
    category: "stages",
    rank: 0,
    members: [
      { areaId: "lotus-stage", instance: 1 },
      { areaId: "lotus-stage", instance: 2 },
      { areaId: "lotus-stage", instance: 3 },
    ],
  },
];

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
