import { isLevelId } from "./levels";
import roomsJson from "./rooms.generated.json";

/**
 * Schedule room → map footprints, for "Show on Map" in the session details.
 * Pure module (the schedule imports it): nothing from three may leak in.
 * `rooms.generated.json` is built from ROOMS in areas.ts.
 */
const ROOM_AREAS: Record<string, string[]> = roomsJson;

/** Query param the map reads to open a floor and show footprints: `?area=<level>/<id>[,<level>/<id>…]`. */
export const AREA_PARAM = "area";

/** `/map?area=…` for a room the map knows, plain `/map` otherwise. */
export function mapHrefForRoom(roomId: string | null | undefined): string {
  const keys = roomId ? ROOM_AREAS[roomId] : undefined;
  return keys?.length ? `/map?${AREA_PARAM}=${encodeURIComponent(keys.join(","))}` : "/map";
}

/** Splits an `area` param into footprint keys on one floor (keys on other floors, or malformed, are dropped). */
export function parseAreaParam(value: string): { level: string; keys: string[] } | null {
  const keys = value.split(",").filter((k) => /^[^/]+\/[^/]+$/.test(k));
  if (!keys.length) return null;
  const level = keys[0].slice(0, keys[0].indexOf("/"));
  if (!isLevelId(level)) return null;
  return { level, keys: keys.filter((k) => k.startsWith(`${level}/`)) };
}
