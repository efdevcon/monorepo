import type { LevelId } from "./types";

/**
 * Schedule room → map footprint (floor + plan layer id), for "Show on Map" in
 * the session details. Test wiring on DC7 data (2026-09-12): Main Stage only.
 * Pure module: the schedule imports it, so nothing from three may leak in here.
 */
const ROOM_AREAS: Record<string, { level: LevelId; id: string }> = {
  "main-stage": { level: "L1", id: "main-stage-mask" },
};

/** Query param the map reads to open a floor and highlight a footprint: `?area=<level>/<layer id>`. */
export const AREA_PARAM = "area";

/** `/map?area=…` for a room the map knows, plain `/map` otherwise. */
export function mapHrefForRoom(roomId: string | null | undefined): string {
  const area = roomId ? ROOM_AREAS[roomId] : undefined;
  return area ? `/map?${AREA_PARAM}=${encodeURIComponent(`${area.level}/${area.id}`)}` : "/map";
}

/** Schedule room id behind a footprint (selection key `<level>/<layer id>`), or null when the map knows none. */
export function roomIdForArea(areaKey: string): string | null {
  return Object.entries(ROOM_AREAS).find(([, a]) => `${a.level}/${a.id}` === areaKey)?.[0] ?? null;
}

/** Splits an `area` param back into its floor and layer id. */
export function parseAreaParam(value: string): { level: string; id: string } | null {
  const slash = value.indexOf("/");
  if (slash <= 0 || slash === value.length - 1) return null;
  return { level: value.slice(0, slash), id: value.slice(slash + 1) };
}
