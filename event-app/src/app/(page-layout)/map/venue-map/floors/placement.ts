import { LEVELS, levelIndex, type LevelId } from "../data/levels";

/**
 * Where each floor rests and how it travels on a floor change. Rest poses:
 * every floor stacked around y = 0 (lowest below, highest above), or the
 * chosen floor at y = 0 with the others parked off-screen on their own side
 * (higher floors above, lower below). The leaving floor always moves away
 * from the entering one; floors hidden on both ends snap so they never
 * cross the screen.
 */
export type FloorPose = { y: number; visible: boolean };
export type FloorMove = { level: LevelId; fromY: number; toY: number; hideAtEnd: boolean };

/** Rest height of a floor in the stack. */
export const stackY = (id: LevelId, gap: number) => (levelIndex(id) - (LEVELS.length - 1) / 2) * gap;

/** Rest height of a floor while `shown` is open: 0 for the shown floor, parked above or below otherwise. */
export const restY = (id: LevelId, shown: LevelId | null, gap: number, exit: number) =>
  shown === null ? stackY(id, gap) : id === shown ? 0 : Math.sign(levelIndex(id) - levelIndex(shown)) * exit;

/**
 * The moves of a floor change from `prev` to `next` (null = stack), given
 * the current poses; mutates nothing. Hidden floors first take their parked
 * pose beside `prev`, so a floor entering from the far side starts off-screen.
 */
export function planFloorTransition(poses: ReadonlyMap<LevelId, FloorPose>, prev: LevelId | null, next: LevelId | null, gap: number, exit: number): { moves: FloorMove[]; snaps: Map<LevelId, FloorPose> } {
  const moves: FloorMove[] = [];
  const snaps = new Map<LevelId, FloorPose>();
  for (const { id } of LEVELS) {
    const pose = poses.get(id) ?? { y: stackY(id, gap), visible: prev === null || id === prev };
    const fromY = pose.visible ? pose.y : prev === null ? pose.y : restY(id, prev, gap, exit);
    const showAfter = next === null || id === next;
    const toY = restY(id, next, gap, exit);
    if (!pose.visible && !showAfter) {
      snaps.set(id, { y: toY, visible: false });
      continue;
    }
    moves.push({ level: id, fromY, toY, hideAtEnd: !showAfter });
  }
  return { moves, snaps };
}
