"use client";

import { useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import cn from "classnames";
import { LEVEL_KEYS } from "./useMapShortcuts";
import type { LevelId, PlanLevel } from "./types";

type FloorSliderProps = {
  levels: PlanLevel[];
  /** Floor shown, or null while every floor is stacked. */
  value: LevelId | null;
  /** Show this floor (idempotent): sliding, and a tap on an inactive stop. */
  onSlide: (level: LevelId) => void;
  /** A clean tap on the active stop: back to the stack. */
  onToggle: (level: LevelId) => void;
  /** The "All" button. */
  onAll: () => void;
};

/** Pointer travel (px) below which a press-and-release on a stop is a tap, not a slide. */
const SLIDE_SLOP_PX = 6;
/** Stop height and the gap between stops (Tailwind h-10 / gap-1), for the indicator's offset. */
const STOP_PX = 40;
const STOP_GAP_PX = 4;
/** Indicator corner radii: full (half its 36px width) on the side touching a track end, 4px otherwise. */
const RADIUS_END_PX = 18;
const RADIUS_MID_PX = 4;
function indicatorRadius(index: number, count: number): string {
  // Parked below the track (stacked) counts as the bottom end, so sliding up into G keeps its shape.
  const top = index === 0 ? RADIUS_END_PX : RADIUS_MID_PX;
  const bottom = index < 0 || index === count - 1 ? RADIUS_END_PX : RADIUS_MID_PX;
  return `${top}px ${top}px ${bottom}px ${bottom}px`;
}

/**
 * Vertical floor selector (Scott, 2026-09-17): the floors as stops from the
 * top floor down, in the recessed track the old pills used, with a white
 * indicator that slides to the shown floor. Press and hold anywhere on the
 * track and drag to slide through the floors; each stop the finger passes
 * opens that floor. A clean tap on an inactive stop opens it, a tap on the
 * active one returns to the stack, as the pills did. "All" sits under the
 * track and is active while the floors are stacked (white like the active
 * stop; the track's fill otherwise). Keyboard users get the stops as radio
 * buttons. Track and All are 44px wide, matching the 44px control pills
 * (Scott, 2026-09-21; was 40).
 */
export function FloorSlider({ levels, value, onSlide, onToggle, onAll }: FloorSliderProps) {
  const stops = [...levels].reverse(); // top floor first, like the building
  const buttonRefs = useRef(new Map<LevelId, HTMLButtonElement | null>());
  // Every stop is STOP_PX tall with STOP_GAP_PX between, so the indicator's offset needs no measuring.
  const activeIndex = value === null ? -1 : stops.findIndex((l) => l.id === value);
  const press = useRef<{ startY: number; startValue: LevelId | null; last: LevelId | null; moved: boolean } | null>(null);

  /** The stop whose centre is nearest the pointer (so dragging past the ends still lands on the end stop). */
  const stopAt = (clientY: number): LevelId | null => {
    let best: LevelId | null = null;
    let bestD = Infinity;
    for (const [id, el] of buttonRefs.current) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const d = Math.abs(clientY - (r.top + r.height / 2));
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const level = stopAt(e.clientY);
    press.current = { startY: e.clientY, startValue: value, last: level, moved: false };
    if (level && level !== value) onSlide(level);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    if (Math.abs(e.clientY - p.startY) > SLIDE_SLOP_PX) p.moved = true;
    const level = stopAt(e.clientY);
    if (level && level !== p.last) {
      p.last = level;
      onSlide(level);
    }
  };
  const onPointerUp = () => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    // A clean tap on the stop that was already active: back to the stack.
    if (!p.moved && p.last !== null && p.last === p.startValue) onToggle(p.last);
  };
  // The browser took the pointer away (system gesture, long-press callout, a second finger): the
  // press is discarded, never treated as a tap — otherwise a cancelled hold on the active stop re-stacked the floors.
  const onPointerCancel = () => {
    press.current = null;
  };
  // Pointer presses are handled on the track above; a click with detail 0 is the keyboard (Enter / Space).
  const onKeyboardClick = (e: MouseEvent<HTMLButtonElement>, level: LevelId) => {
    if (e.detail !== 0) return;
    if (level === value) onToggle(level);
    else onSlide(level);
  };
  // Radio-group keyboard pattern: the arrows move between the stops (top floor first, like the
  // track) and show the floor they land on; Home / End jump to the ends. 1 / 2 / 3 stay global.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const focused = stops.findIndex((l) => buttonRefs.current.get(l.id) === document.activeElement);
    let next: number;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = Math.min(stops.length - 1, (focused < 0 ? activeIndex : focused) + 1);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = Math.max(0, (focused < 0 ? activeIndex : focused) - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = stops.length - 1;
    else return;
    e.preventDefault();
    const level = stops[next];
    buttonRefs.current.get(level.id)?.focus();
    onSlide(level.id);
  };

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Floor"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
        style={{ touchAction: "none" }}
        // Grab hand: the track is something you hold and slide, not a set of links (Scott).
        className="relative flex w-11 cursor-grab select-none flex-col gap-1 overflow-hidden rounded-full active:cursor-grabbing bg-dc-lavender p-1 shadow-[inset_0px_1px_1px_rgba(34,17,68,0.15),inset_0px_2px_4px_rgba(34,17,68,0.06)] lg:bg-dc-panel"
      >
        <div
          aria-hidden
          // Stacked ("All" active): parked one stop below the track, faded out, so picking a floor
          // slides the indicator up from the All side rather than dropping in from the top.
          style={{
            transform: `translateY(${(activeIndex < 0 ? stops.length : activeIndex) * (STOP_PX + STOP_GAP_PX)}px)`,
            height: STOP_PX,
            opacity: activeIndex < 0 ? 0 : 1,
            // Corners follow the track's pill shape: fully round on the side touching an end of the
            // track, 4px elsewhere, morphing between positions. Full = half the 36px width (a real
            // value, not 9999px, so the transition interpolates visibly).
            borderRadius: indicatorRadius(activeIndex, stops.length),
          }}
          className="absolute left-1 right-1 top-1 bg-white shadow-[0px_1px_3px_rgba(22,11,43,0.1),0px_1px_2px_rgba(22,11,43,0.1)] transition-[transform,opacity,border-radius] duration-150 ease-out motion-reduce:transition-none"
        />
        {stops.map((level) => (
          <button
            key={level.id}
            type="button"
            role="radio"
            aria-checked={value === level.id}
            aria-label={level.name}
            title={`${level.name} · ${LEVEL_KEYS[level.id]}`}
            ref={(el) => {
              buttonRefs.current.set(level.id, el);
            }}
            onClick={(e) => onKeyboardClick(e, level.id)}
            className={cn(
              "relative z-10 flex h-10 w-full cursor-[inherit] items-center justify-center rounded-full text-[16px] leading-none transition-colors",
              value === level.id ? "font-bold text-dc-purple" : "font-medium text-dc-muted"
            )}
          >
            {level.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={value === null}
        title="All floors · A / Esc"
        onClick={onAll}
        className={cn(
          // Same type as the stops: 16px (2026-09-21, was 14), bold purple when active, medium muted otherwise. 44px disc = the touch floor.
          "relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-dc-hairline text-[16px] leading-none transition-colors duration-150 ease-out",
          // Active: the Find pill's surface exactly (border, white/90 + blur, one soft shadow) so the two bottom controls match.
          value === null
            ? "bg-white/90 font-bold text-dc-purple shadow-[0_1px_3px_rgba(22,11,43,0.12)] backdrop-blur"
            : "bg-dc-lavender font-medium text-dc-muted hover:text-dc-purple lg:bg-dc-panel"
        )}
      >
        All
      </button>
    </div>
  );
}
