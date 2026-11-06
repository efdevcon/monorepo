import { isLevelId, LEVELS } from "./levels";
import roomsJson from "./rooms.generated.json";

/**
 * Schedule room → map footprints, for "Show on Map" in the session details.
 * Pure module (the schedule imports it): nothing from three may leak in.
 * `rooms.generated.json` is built from ROOMS in areas.ts.
 */
const ROOM_AREAS: Record<string, string[]> = roomsJson;

/** Query param the map reads to open a floor and show footprints: `?area=<level>/<id>[,<level>/<id>…]`. */
export const AREA_PARAM = "area";

/** `/map?area=…` showing these footprints (the card's share link; one floor's keys). */
export const mapHrefForAreas = (keys: readonly string[]): string => `/map?${AREA_PARAM}=${encodeURIComponent(keys.join(","))}`;

/**
 * The swag QR modal's "Claim at Swag Station" link. The station's footprint key is the plan's
 * (`L3/swag-station` in plan.generated.json); an unknown key opens a bare map, so keep it in step with the plan.
 */
export const SWAG_STATION_MAP_HREF = mapHrefForAreas(["L3/swag-station"]);

/** The ENS perk card's booth link: Starter Supporter 1, removed from the plan on 2026-11-06 (ENS left), so this opens a bare map. */
export const ENS_BOOTH_MAP_HREF = mapHrefForAreas(["L3/starter-1"]);

/** `/map?area=…` for a room the map knows, plain `/map` otherwise. */
export function mapHrefForRoom(roomId: string | null | undefined): string {
  const keys = roomId ? ROOM_AREAS[roomId] : undefined;
  return keys?.length ? mapHrefForAreas(keys) : "/map";
}

/**
 * The floor label ("L3") of a room the map knows, for the session details'
 * location line; null for rooms off the map. Reads the first footprint's
 * level: a room spanning floors is not a thing in this venue.
 */
export function floorLabelForRoom(roomId: string | null | undefined): string | null {
  const key = roomId ? ROOM_AREAS[roomId]?.[0] : undefined;
  if (!key) return null;
  const level = key.slice(0, key.indexOf("/"));
  return LEVELS.find((l) => l.id === level)?.label ?? null;
}

/**
 * "Lotus Stage 2 (L3)": a room label with its floor appended, so people know
 * where to head before opening the map (Scott, 2026-11-04). Rooms the map
 * does not know come back unchanged.
 */
export function withFloor(label: string, roomId: string | null | undefined): string {
  const floor = floorLabelForRoom(roomId);
  return floor ? `${label} (${floor})` : label;
}

/** Splits an `area` param into footprint keys on one floor (keys on other floors, or malformed, are dropped). */
export function parseAreaParam(value: string): { level: string; keys: string[] } | null {
  const keys = value.split(",").filter((k) => /^[^/]+\/[^/]+$/.test(k));
  if (!keys.length) return null;
  const level = keys[0].slice(0, keys[0].indexOf("/"));
  if (!isLevelId(level)) return null;
  return { level, keys: keys.filter((k) => k.startsWith(`${level}/`)) };
}
