import { communityHubLogo, communityHubLockup, findCommunityHub, type CommunityHub } from "@/data/communityHubs";
import { AREAS, COMPOSITES, type AreaId, type AreaSpec, type Composite } from "./areas";
import { categoryById, type Category } from "./categories";
import { iconUrl, type IconName } from "./icons.generated";
import { LEVELS, type LevelId } from "./levels";
import { mapBundleSchema, type MapBundle, type MapLevel, type MapShape } from "./planSchema";
import planJson from "./plan.generated.json";
import roomsJson from "./rooms.generated.json";

/** Selection / hover key of a footprint: `${level}/${layer id}` (layer ids repeat across floors). */
export type AreaKey = string;

/**
 * A tappable footprint joined to its catalogue entry: everything the card,
 * Find, Search, the legend, the sprites and the live-session hook read.
 */
export type Area = {
  key: AreaKey;
  level: LevelId;
  levelName: string;
  areaId: AreaId;
  instance: number | null;
  name: string;
  description: string;
  category: Category;
  /** The legend chip's category (areas.ts `legend`, else the category). */
  legendCategory: Category;
  icon: IconName | null;
  /** The image standing on the footprint (sprite or decal). */
  iconUrl: string | null;
  /** The image for the card and the Find / Search / legend chips: a supporter's full lockup where the booth carries a compact one (areas.ts `cardLogo`), else `iconUrl`. */
  cardIconUrl: string | null;
  heightClass: AreaSpec["heightClass"];
  /** Sprite height override in metres (areas.ts). */
  iconSize: number | null;
  shape: MapShape;
  /** Schedule rooms whose sessions happen here (rooms.generated.json, plus a hub's own room). */
  roomIds: readonly string[];
  /** The Community Hub at this booth, when the catalogue assigns one: its mark is the sprite, its lockup the card's. */
  hub: CommunityHub | null;
  lockupUrl: string | null;
  /** The plan's own name for a hub or supporter booth ("Hub 7", "Starter Supporter S12"), kept beside the tenant's name. */
  boothName: string | null;
  /** Fill behind the icon in the card and lists, for logos drawn in white (supporters). */
  iconBackdrop: string | null;
  /** List position within the category (areas.ts `rank`). */
  rank: number;
  /** The place's own site (areas.ts `website`), "Visit website" on the card. */
  website: string | null;
  /** The venue's room name or number (areas.ts `room` / `rooms`), after the floor on the card. */
  room: string | null;
};

export const plan: MapBundle = mapBundleSchema.parse(planJson);
export const ROOM_AREAS: Record<string, AreaKey[]> = roomsJson;

const levelName = new Map<string, string>(LEVELS.map((l) => [l.id, l.name]));
const roomsByKey = new Map<AreaKey, string[]>();
for (const [roomId, keys] of Object.entries(ROOM_AREAS)) for (const key of keys) roomsByKey.set(key, [...(roomsByKey.get(key) ?? []), roomId]);

function resolveShape(shape: MapShape): Area | null {
  if (shape.kind !== "area" || !shape.areaId) return null;
  const spec: AreaSpec = AREAS[shape.areaId as AreaId];
  const instance = shape.instance ?? null;
  const icon = (instance !== null ? spec.icons?.[instance] : undefined) ?? spec.icon ?? null;
  const planName = spec.name.replace("#", instance === null ? "" : String(instance)).trim();
  const hub = (instance !== null && spec.hubs?.[instance] ? findCommunityHub(spec.hubs[instance]) : undefined) ?? null;
  const tenant = (instance !== null ? spec.tenants?.[instance] : undefined) ?? null;
  return {
    key: shape.key,
    level: shape.level as LevelId,
    levelName: levelName.get(shape.level) ?? shape.level,
    areaId: shape.areaId as AreaId,
    instance,
    name: hub ? hub.name : tenant ? tenant.name : planName,
    description: hub ? hub.description : tenant ? "" : spec.description,
    category: categoryById(spec.category),
    legendCategory: categoryById(spec.legend ?? spec.category),
    icon,
    iconUrl: hub ? communityHubLogo(hub) : tenant ? tenant.logo : icon ? iconUrl(icon) : null,
    cardIconUrl: hub ? communityHubLogo(hub) : tenant ? (tenant.cardLogo ?? tenant.logo) : icon ? iconUrl(icon) : null,
    heightClass: spec.heightClass,
    iconSize: spec.iconSize ?? null,
    shape,
    roomIds: [...(roomsByKey.get(shape.key) ?? []), ...(hub ? [`community-hub-${hub.id}`] : [])],
    hub,
    lockupUrl: hub ? communityHubLockup(hub) : null,
    boothName: hub || tenant ? planName : null,
    iconBackdrop: tenant ? shape.fill : null,
    rank: spec.rank ?? 100,
    website: spec.website ?? null,
    room: (instance !== null ? spec.rooms?.[instance] : undefined) ?? spec.room ?? null,
  };
}

/** Every tappable footprint, in bundle order (floor by floor). Built once at module load; the plan is static. */
export const AREA_LIST: readonly Area[] = plan.levels.flatMap((l: MapLevel) => l.shapes.map(resolveShape).filter((a): a is Area => a !== null));
const areaByKey = new Map<AreaKey, Area>(AREA_LIST.map((a) => [a.key, a]));

export const areaOf = (key: AreaKey): Area | null => areaByKey.get(key) ?? null;
export const levelOf = (id: LevelId): MapLevel => plan.levels.find((l) => l.id === id)!;
export const areasOnLevel = (id: LevelId): Area[] => AREA_LIST.filter((a) => a.level === id);

/** A composite (areas.ts) with its members resolved; composites whose members are not all drawn are skipped. */
export type ResolvedComposite = Composite & { level: LevelId; areas: Area[] };
export const COMPOSITE_LIST: readonly ResolvedComposite[] = COMPOSITES.flatMap((c) => {
  const areas = c.members.map((m) => AREA_LIST.find((a) => a.areaId === m.areaId && (m.instance === undefined ? a.instance === null : a.instance === m.instance))).filter((a): a is Area => a !== undefined);
  if (areas.length !== c.members.length || new Set(areas.map((a) => a.level)).size !== 1) return [];
  return [{ ...c, level: areas[0].level, areas }];
});

/** The composite a highlighted group stands for, if the keys are exactly its members. */
export function compositeOf(keys: readonly AreaKey[]): ResolvedComposite | null {
  return COMPOSITE_LIST.find((c) => c.areas.length === keys.length && c.areas.every((a) => keys.includes(a.key))) ?? null;
}
