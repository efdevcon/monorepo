import { communityHubLogo, communityHubLockup, findCommunityHub, type CommunityHub } from "@/data/communityHubs";
import { AREAS, type AreaId, type AreaSpec } from "./areas";
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
  icon: IconName | null;
  iconUrl: string | null;
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
    icon,
    iconUrl: hub ? communityHubLogo(hub) : tenant ? tenant.logo : icon ? iconUrl(icon) : null,
    heightClass: spec.heightClass,
    iconSize: spec.iconSize ?? null,
    shape,
    roomIds: [...(roomsByKey.get(shape.key) ?? []), ...(hub ? [`community-hub-${hub.id}`] : [])],
    hub,
    lockupUrl: hub ? communityHubLockup(hub) : null,
    boothName: hub || tenant ? planName : null,
    iconBackdrop: tenant ? shape.fill : null,
  };
}

/** Every tappable footprint, in bundle order (floor by floor). Built once at module load; the plan is static. */
export const AREA_LIST: readonly Area[] = plan.levels.flatMap((l: MapLevel) => l.shapes.map(resolveShape).filter((a): a is Area => a !== null));
const areaByKey = new Map<AreaKey, Area>(AREA_LIST.map((a) => [a.key, a]));

export const areaOf = (key: AreaKey): Area | null => areaByKey.get(key) ?? null;
export const levelOf = (id: LevelId): MapLevel => plan.levels.find((l) => l.id === id)!;
export const areasOnLevel = (id: LevelId): Area[] => AREA_LIST.filter((a) => a.level === id);
