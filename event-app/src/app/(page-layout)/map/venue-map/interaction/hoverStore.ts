import { useSyncExternalStore } from "react";
import type { LevelId } from "../data/levels";
import type { AreaKey } from "../data/resolve";

/**
 * What the pointer is over, outside React: the raycast owner (pointer.ts)
 * writes it on every move, meshes subscribe to their own key and the cursor
 * and `window.__mapHover` read it imperatively. `"level:<id>"` is a stacked
 * floor, otherwise an area key.
 */
export type HoverKey = AreaKey | `level:${LevelId}` | null;

type Listener = () => void;

class HoverStore {
  private value: HoverKey = null;
  private listeners = new Set<Listener>();
  get(): HoverKey {
    return this.value;
  }
  set(next: HoverKey) {
    if (next === this.value) return;
    this.value = next;
    for (const l of this.listeners) l();
  }
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };
}

export const hoverStore = new HoverStore();

/** True while this key is hovered; re-renders only the component whose answer changed. */
export function useHovered(key: HoverKey): boolean {
  return useSyncExternalStore(
    hoverStore.subscribe,
    () => hoverStore.get() === key,
    () => false
  );
}

/** The hovered stacked floor, or null. */
export function useHoveredLevel(): LevelId | null {
  return useSyncExternalStore(
    hoverStore.subscribe,
    () => {
      const v = hoverStore.get();
      return v?.startsWith("level:") ? (v.slice("level:".length) as LevelId) : null;
    },
    () => null
  );
}

/** Any hover at all (cursor). */
export function useAnyHover(): boolean {
  return useSyncExternalStore(
    hoverStore.subscribe,
    () => hoverStore.get() !== null,
    () => false
  );
}
