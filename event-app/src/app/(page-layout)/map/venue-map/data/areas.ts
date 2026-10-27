import type { CategoryId } from "./categories";
import type { IconName } from "./icons.generated";

/**
 * Extrusion classes (metres, deliberately taller than life so the blocks read
 * at the fitted zoom; the plan is ~245 m wide). `zone` is a flat mat: hubs,
 * tea & coffee, storage and the elevators sit on the floor like the co-work
 * areas (Scott, 2026-10-25); stages, washrooms, suites and supporter booths stand up.
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
  /** The place's own site, linked as "Visit website" under the card's description (https only). */
  website?: string;
  /** The venue's room name or number, shown after the floor on the card ("Level 2 · 204A/B"). */
  room?: string;
  /** Per instance number: the same for numbered layers (Workshop 1 → 205A/B). */
  rooms?: Readonly<Record<number, string>>;
};

/**
 * A supporter at a booth. `logo` is a path under public/ (white lockups, on the booth's fill colour): the
 * decal on the booth, and the card and list chips unless `cardLogo` names a fuller lockup for those (the
 * compact marks that fit a small booth's top are too terse for a chip; Scott, 2026-10-27).
 */
export type Tenant = { name: string; logo: string; cardLogo?: string };

const supporter = (name: string, file: string, cardFile?: string): Tenant => ({ name, logo: `/maps/jwcc/supporters/${file}.svg`, ...(cardFile ? { cardLogo: `/maps/jwcc/supporters/${cardFile}.svg` } : {}) });

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
  "lightning-stage": { name: "Lightning Stage", description: "Short talks, back to back.", category: "stages", heightClass: "stage", rank: 25, icon: "lightning-stage", room: "204A/B" },
  "cls-stage": { name: "Community Led Stage", description: "Community-led sessions.", category: "stages", heightClass: "stage", rank: 40, icon: "community-led-stage" },
  // The blue box beside the Community Led Stage on the Level 0 plan was unnamed in the export; named in the committed copy as the CLS Builders Room (the other CLS room in Pretalx). Confirm with Scott.
  // The blue box beside the Community Led Stage (Scott, 2026-10-26): a community place, under the Stages chip by its colour.
  "cls-hangout-area": { name: "CLS Hangout Area", description: "Hang out around the Community Led Stage.", category: "hubs", legend: "stages", heightClass: "room", rank: 5 },
  // Workshops (Level 2): community places, listed with the hubs (Scott, 2026-10-26)
  workshop: { name: "Workshop #", description: "Hands-on workshops.", category: "hubs", heightClass: "room", icon: "workshop", rooms: { 1: "205A/B", 2: "206A/B" } },
  // Suites (Level 1 and 2): the plan names them after Ethereum upgrades with the room number; the layer names carry both.
  "frontier-suite": { name: "Frontier Suite #", description: "", category: "suites", heightClass: "room", icon: "suites" },
  "homestead-suite-104b": { name: "Homestead Suite 104b", description: "", category: "suites", heightClass: "room", icon: "suites" },
  "tangerine-whistle-suite-105a": { name: "Tangerine Whistle Suite 105a", description: "", category: "suites", heightClass: "room", icon: "suites" },
  "spurious-dragon-suite-105a": { name: "Spurious Dragon Suite 105a", description: "", category: "suites", heightClass: "room", icon: "suites" },
  "byzantium-suite-105b": { name: "Byzantium Suite 105b", description: "", category: "suites", heightClass: "room", icon: "suites" },
  "constantinople-suite-105b": { name: "Constantinople Suite 105b", description: "", category: "suites", heightClass: "room", icon: "suites" },
  "bellatrix-suite": { name: "Bellatrix Suite #", description: "", category: "suites", heightClass: "room", icon: "suites" },
  "the-merge-suite": { name: "The Merge Suite #", description: "", category: "suites", heightClass: "room", icon: "suites" },
  "shapella-suite-207a": { name: "Shapella Suite 207a", description: "", category: "suites", heightClass: "room", icon: "suites" },
  "dencun-suite-207b": { name: "Dencun Suite 207b", description: "", category: "suites", heightClass: "room", icon: "suites" },
  "pectra-suite-207c": { name: "Pectra Suite 207c", description: "", category: "suites", heightClass: "room", icon: "suites" },
  "fusaka-suite-208a": { name: "Fusaka Suite 208a", description: "", category: "suites", heightClass: "room", icon: "suites" },
  "glamsterdam-suite-208b": { name: "Glamsterdam Suite 208b", description: "", category: "suites", heightClass: "room", icon: "suites" },
  "hegota-suite-208c": { name: "Hegota Suite 208c", description: "", category: "suites", heightClass: "room", icon: "suites" },
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
  // supporter set, as a test (colour versions may follow). Shared booths name one supporter only:
  // which supporters are present changes mid-event and is updated then (Scott, 2026-10-25).
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
    tenants: { 1: supporter("Gnosis", "gnosis"), 2: supporter("Kleros", "kleros"), 3: supporter("Arkiv", "arkiv"), 4: supporter("OpenZeppelin", "openzeppelin") },
  },
  starter: {
    name: "Starter Supporter S#",
    description: "Supporter booth.",
    category: "supporters",
    heightClass: "kiosk",
    tenants: {
      1: supporter("ENS", "ens"),
      2: supporter("Ordocode", "ordocode", "ordocode-full"),
      3: supporter("Nethermind", "nethermind"),
      4: supporter("Bitget", "bitget"),
      5: supporter("World", "world"),
      6: supporter("Trail of Bits", "trail-of-bits"),
      7: supporter("Swarm", "swarm"),
      8: supporter("Linux Foundation Decentralized Trust", "lfdt"),
      9: supporter("EEZ", "eez", "eez-full"),
      10: supporter("Crossbar", "crossbar"),
      11: supporter("UNICEF", "unicef"),
      12: supporter("Kohaku", "kohaku", "kohaku-full"),
      13: supporter("Ethereum Applications Guild", "eag", "eag-full"),
      14: supporter("EIPsInsight", "eipsinsight"),
      15: supporter("growthepie", "growthepie"),
      16: supporter("GCC Commons", "gcc"),
      17: supporter("ETH Labs", "eth-labs"),
      18: supporter("Railgun", "railgun"),
      19: supporter("Walletbeat", "walletbeat", "walletbeat-full"),
      20: supporter("Nimbus", "nimbus", "nimbus-full"),
      21: supporter("GrapheneOS", "grapheneos", "grapheneos-full"),
    },
  },
  // Food & drink
  "tea-coffee": { name: "Tea & Coffee", description: "Tea, coffee and snacks all day.", category: "food", heightClass: "zone", icon: "coffee", minWidth: 2.5 },
  "food-garden": { name: "Food Garden", description: "Open 12:00 – 14:30 every day. Tea, coffee and snacks all day.", category: "food", heightClass: "zone", icon: "food-area", iconSize: 16 },
  // Washrooms
  washroom: { name: "Washroom", description: "", category: "toilets", heightClass: "room", icon: "toilets" },
  // Cowork & discussion
  "co-work-area": { name: "Co-work Area", description: "Desks, power and wifi.", category: "cowork", heightClass: "zone", icon: "cowork" },
  "quiet-co-work": { name: "Quiet Co-work", description: "Heads-down desks, keep it quiet.", category: "cowork", heightClass: "zone", icon: "cowork" },
  "blue-discussion-corner": { name: "Blue Discussion Corner", description: "Open discussions, drop in.", category: "cowork", legend: "hubs", heightClass: "zone", icon: "discussion-corner", iconSize: 4.5 },
  "pink-discussion-corner": { name: "Pink Discussion Corner", description: "Open discussions, drop in.", category: "cowork", legend: "hubs", heightClass: "zone", icon: "discussion-corner", iconSize: 4.5 },
  // Check-in & swag
  "swag-station": { name: "Swag Station", description: "Collect your swag with your ticket.", category: "checkin", legend: "fun", heightClass: "kiosk", icon: "swag-station" },
  registration: { name: "Registration", description: "Check in and collect your badge.", category: "checkin", heightClass: "kiosk", icon: "registration-wristband" },
  "badge-pickup": { name: "Badge Pickup #", description: "Collect your badge.", category: "checkin", heightClass: "kiosk", icon: "badge-pickup" },
  "help-desk": { name: "Help Desk", description: "Questions about the event.", category: "checkin", heightClass: "kiosk", icon: "help-desk" },
  "cloak-room-lost-and-found": { name: "Cloak Room & Lost and Found", description: "Leave your bags; lost property is kept here.", category: "checkin", heightClass: "kiosk", icon: "cloak-room" },
  // Fun & rest
  "decompression-zone": { name: "Decompression Zone", description: "Slow down and rest.", category: "cowork", heightClass: "zone", icon: "decompression" },
  "game-zone": { name: "Game Zone", description: "Ethereum games worth playing, and the people building them. Curated by nejc, back for a second Devcon.", category: "fun", heightClass: "zone", icon: "game-zone" },
  "art-gallery": { name: "Art Gallery", description: "What does Ethereum look, sound and feel like beyond the code? The Infinite Garden Artist Cohort 2026 shows two months of answers.", category: "fun", heightClass: "zone", icon: "art-gallery" },
  "poster-display": { name: "Poster Display", description: "Research posters.", category: "fun", heightClass: "zone", icon: "poster-display" },
  "poster-printing-station": { name: "Poster Printing Station", description: "Print your poster for the display.", category: "fun", heightClass: "zone", icon: "poster-printing-station" },
  "content-corner": { name: "Content Corner", description: "Interviews and recordings.", category: "fun", heightClass: "zone", icon: "press", iconSize: 4.5 },
  "open-hardware-zone": {
    name: "Open Hardware Zone",
    description: "Open hardware, hands on, with Maker's Asylum: the Goa makerspace and community of makers, builders and problem-solvers behind #MakeBreakCreate.",
    category: "fun",
    legend: "hubs",
    heightClass: "zone",
    icon: "open-hardware-zone",
    website: "https://www.makersasylum.com/",
  },
  // Other
  "speakers-lounge": { name: "Speakers Lounge", description: "Speakers only.", category: "other", heightClass: "room", icon: "speakers-lounge" },
  "interview-room": { name: "Interview Room", description: "Press interviews.", category: "other", heightClass: "room", icon: "interview-room", room: "Business Lounge 1" },
  "baby-care-room": { name: "Baby Care Room", description: "A quiet room for parents and babies.", category: "other", heightClass: "room", icon: "baby-care-room", room: "Business Lounge 2" },
  // Elevators: odd instances stand on the west side, even on the east, facing the other way.
  elevator: { name: "Elevators", description: "", category: "other", heightClass: "zone", icon: "elevator-right", icons: { 2: "elevator-left", 4: "elevator-left", 6: "elevator-left", 8: "elevator-left" }, iconSize: 6.5 },
  // Outline symbol groups (named, or found by their drawing): the plan's escalator drawings are replaced by the sprite (hidden footprint, see build).
  escalator: { name: "Escalator", description: "", category: "other", heightClass: "zone", icon: "escalator-right", iconSize: 6.5 },
  // Stairs: the plan's symbol group is replaced by the sprite like the escalators (icon since 2026-10-26).
  stairs: { name: "Stairs", description: "", category: "other", heightClass: "zone", icon: "stairs", iconSize: 5 },
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
  "lightning-stage": [{ areaId: "lightning-stage" }],
  "workshop-1": [{ areaId: "workshop", instance: 1 }],
  "workshop-2": [{ areaId: "workshop", instance: 2 }],
  "community-led-stage": [{ areaId: "cls-stage" }],
  // Until the CLS Builders Room gets its own box (planned 2026-10-28): its Open Tech Summit sessions point at the hangout area beside the stage, roughly where they happen (Scott, 2026-10-26).
  "cls-builders-room": [{ areaId: "cls-hangout-area" }],
  "music-stage": [{ areaId: "music-stage" }],
};
