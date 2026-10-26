"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Group, Vector3 } from "three";
import cn from "classnames";
import { LEVELS, type LevelId } from "../data/levels";
import { plan } from "../data/resolve";
import { hoverStore, useHoveredLevel } from "../interaction/hoverStore";

/**
 * The floor's short label beside it in the stack, always visible, the other
 * floors' labels dimming while one floor is hovered. A button: clicking it
 * opens the floor, hovering it hovers the floor (same hover key as the
 * pointer over the floor itself). Re-anchored each frame at whichever corner
 * of the building's extent (every floor's bounds together) is right-most on
 * screen, 24px off it (40px on desktop), so the labels line up in one column
 * however deep each floor is (Scott, 2026-10-26).
 * Only the button takes the pointer; the drei Html wrapper stays transparent.
 */
export function FloorLabel({ level, onOpen }: { level: LevelId; onOpen: () => void }) {
  const anchor = useRef<Group>(null);
  const spec = LEVELS.find((l) => l.id === level)!;
  const pts = useMemo(() => {
    const b = plan.bounds;
    return [new Vector3(b.minX, 1, b.minZ), new Vector3(b.maxX, 1, b.minZ), new Vector3(b.maxX, 1, b.maxZ), new Vector3(b.minX, 1, b.maxZ)];
  }, []);
  const scratch = useMemo(() => new Vector3(), []);
  const hoveredLevel = useHoveredLevel();
  const dimmed = hoveredLevel !== null && hoveredLevel !== level;
  useFrame(({ camera }) => {
    const g = anchor.current;
    if (!g?.parent) return;
    let best = pts[0];
    let bestX = -Infinity;
    for (const p of pts) {
      const sx = g.parent.localToWorld(scratch.copy(p)).project(camera).x;
      if (sx > bestX) {
        bestX = sx;
        best = p;
      }
    }
    g.position.copy(best);
  });
  return (
    <group ref={anchor} position={pts[1]}>
      <Html zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <button
          type="button"
          aria-label={`Open ${spec.name}`}
          onClick={onOpen}
          onPointerEnter={() => hoverStore.set(`level:${level}`)}
          onPointerLeave={() => hoverStore.set(null)}
          className={cn(
            "pointer-events-auto block cursor-pointer whitespace-nowrap font-heading font-bold leading-none tracking-[-0.5px] text-dc-muted hover:text-dc-purple",
            "translate-x-6 -translate-y-1/2 text-[24px] lg:text-[40px]",
            "transition-[opacity,color] duration-150 ease-out motion-reduce:transition-none",
            dimmed ? "opacity-30" : "opacity-100"
          )}
        >
          {spec.label}
        </button>
      </Html>
    </group>
  );
}
