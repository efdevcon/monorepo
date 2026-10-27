import { LEVELS, type LevelId } from "../data/levels";
import type { AreaKey } from "../data/resolve";

/**
 * The map's UI state as one reducer, so every transition keeps the
 * invariants in one place (asserted in mapStore.test.ts):
 * - `selected` is on the open floor; a floor change clears selection, group
 *   and focus unless the same action set them;
 * - `group` implies `selected` is one of its keys;
 * - `query` is empty unless the Search panel is open.
 * Camera commands derive from state changes (camera/CameraRig.tsx reads
 * `focus.seq` and `resetSeq`), never from imperative calls out of handlers.
 */
export type PanelId = "find" | "search";

export type Tuning = {
  /** Vertical gap between stacked floors, metres. */
  levelGap: number;
  showIcons: boolean;
  /** How far the floor turns from the start view, degrees: left = lower azimuth (venue front). */
  rotateLeftDeg: number;
  rotateRightDeg: number;
  /** Zoom factor per double tap. */
  zoomStep: number;
  projection: "ortho" | "perspective";
  /** Supporter lockups: a decal stuck flat on the booth's top (the look since 2026-10-27, Scott) or a sprite floating over it (the earlier look, kept to compare; a mixed rule by booth size may follow review). */
  supporterLogos: "float" | "decal";
};

export const DEFAULT_TUNING: Tuning = { levelGap: 60, showIcons: true, rotateLeftDeg: 75, rotateRightDeg: 85, zoomStep: 1.8, projection: "ortho", supporterLogos: "decal" };

export type Focus = {
  /** Bumps on every focus so the camera re-runs for the same target. */
  seq: number;
  keys: AreaKey[];
  /** Zoom over the fitted floor for a single footprint; a group fits its bounds instead. */
  zoom: number;
};

export type MapState = {
  /** Floor shown; null = every floor stacked. */
  floor: LevelId | null;
  selected: AreaKey | null;
  /** A found group: every member highlighted, the card parked clear of them. */
  group: AreaKey[] | null;
  /** What the group stands for when it is a composite (the Main Stage); the card takes the name. */
  groupName: string | null;
  focus: Focus | null;
  /** Bumps on every reset (tab re-tap, Esc, "All"). */
  resetSeq: number;
  panel: PanelId | null;
  query: string;
  debug: boolean;
  tuning: Tuning;
};

export type MapAction =
  | { type: "openFloor"; level: LevelId }
  | { type: "toggleFloor"; level: LevelId }
  | { type: "showStack" }
  | { type: "select"; key: AreaKey | null }
  | { type: "showAreas"; keys: AreaKey[]; primary: AreaKey; zoom: number; name?: string }
  | { type: "reset" }
  | { type: "openPanel"; panel: PanelId }
  | { type: "closePanel" }
  | { type: "setQuery"; query: string }
  | { type: "toggleDebug" }
  | { type: "tune"; tuning: Partial<Tuning> };

/** One floor: it is always open (a stack of one is just that floor). */
export const SINGLE_FLOOR = (LEVELS as readonly unknown[]).length === 1;
export const LANDING_FLOOR: LevelId | null = SINGLE_FLOOR ? LEVELS[0].id : null;

export const initialState: MapState = {
  floor: LANDING_FLOOR,
  selected: null,
  group: null,
  groupName: null,
  focus: null,
  resetSeq: 0,
  panel: null,
  query: "",
  debug: false,
  tuning: DEFAULT_TUNING,
};

const levelOfKey = (key: AreaKey) => key.slice(0, key.indexOf("/")) as LevelId;

const clearSelection = (s: MapState): MapState => (s.selected === null && s.group === null && s.focus === null ? s : { ...s, selected: null, group: null, groupName: null, focus: null });

export function reduce(state: MapState, action: MapAction): MapState {
  switch (action.type) {
    case "openFloor":
      return state.floor === action.level ? state : { ...clearSelection(state), floor: action.level };
    case "toggleFloor":
      if (state.floor === action.level) return SINGLE_FLOOR ? state : { ...clearSelection(state), floor: null };
      return { ...clearSelection(state), floor: action.level };
    case "showStack":
      return state.floor === null || SINGLE_FLOOR ? state : { ...clearSelection(state), floor: null };
    case "select": {
      if (action.key === null) return clearSelection(state);
      if (levelOfKey(action.key) !== state.floor) return state; // taps only land on the open floor
      return { ...state, selected: action.key, group: null, groupName: null, focus: null };
    }
    case "showAreas": {
      if (!action.keys.length || !action.keys.includes(action.primary)) return state;
      const level = levelOfKey(action.primary);
      if (action.keys.some((k) => levelOfKey(k) !== level)) return state;
      return {
        ...state,
        floor: level,
        selected: action.primary,
        group: action.keys.length > 1 ? action.keys : null,
        groupName: action.keys.length > 1 ? action.name ?? null : null,
        focus: { seq: (state.focus?.seq ?? 0) + 1, keys: action.keys, zoom: action.zoom },
        panel: null,
        query: "",
      };
    }
    case "reset":
      return { ...clearSelection(state), floor: LANDING_FLOOR, panel: null, query: "", resetSeq: state.resetSeq + 1 };
    case "openPanel":
      return state.panel === action.panel ? state : { ...state, panel: action.panel, query: "" };
    case "closePanel":
      return state.panel === null ? state : { ...state, panel: null, query: "" };
    case "setQuery":
      return state.panel !== "search" ? state : { ...state, query: action.query };
    case "toggleDebug":
      return { ...state, debug: !state.debug };
    case "tune":
      return { ...state, tuning: { ...state.tuning, ...action.tuning } };
  }
}

/** The invariants every state must satisfy; the test suite checks them after every transition. */
export function violations(s: MapState): string[] {
  const out: string[] = [];
  if (s.selected !== null && levelOfKey(s.selected) !== s.floor) out.push("selected off the open floor");
  if (s.group !== null && (s.selected === null || !s.group.includes(s.selected))) out.push("group without its primary selected");
  if (s.groupName !== null && s.group === null) out.push("group name without a group");
  if (s.panel !== "search" && s.query !== "") out.push("query outside Search");
  if (SINGLE_FLOOR && s.floor === null) out.push("stack with a single floor");
  return out;
}
