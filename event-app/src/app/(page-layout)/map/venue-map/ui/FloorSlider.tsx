"use client";

import { useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import cn from "classnames";
import { LEVEL_KEYS, LEVELS, type LevelId } from "../data/levels";

/** Pointer travel (px) below which a press-and-release on a stop is a tap, not a slide. */
const SLIDE_SLOP_PX = 6;
const STOP_PX = 40;
const STOP_GAP_PX = 4;
const RADIUS_END_PX = 18;
const RADIUS_MID_PX = 4;
function indicatorRadius(index: number, count: number): string {
  const top = index === 0 ? RADIUS_END_PX : RADIUS_MID_PX;
  const bottom = index < 0 || index === count - 1 ? RADIUS_END_PX : RADIUS_MID_PX;
  return `${top}px ${top}px ${bottom}px ${bottom}px`;
}

/**
 * Vertical floor selector: the floors as stops from the top floor down in a
 * recessed 44px track, a white indicator sliding to the shown floor. Press
 * and hold anywhere and drag to slide through the floors; a clean tap on an
 * inactive stop opens it, on the active one returns to the stack. "All"
 * under the track is active while stacked. Keyboard: a radio group.
 */
export function FloorSlider({ value, onSlide, onToggle, onAll }: { value: LevelId | null; onSlide: (level: LevelId) => void; onToggle: (level: LevelId) => void; onAll: () => void }) {
  const stops = [...LEVELS].reverse();
  const buttonRefs = useRef(new Map<LevelId, HTMLButtonElement | null>());
  const activeIndex = value === null ? -1 : stops.findIndex((l) => l.id === value);
  const press = useRef<{ startY: number; startValue: LevelId | null; last: LevelId | null; moved: boolean } | null>(null);
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
    if (p && !p.moved && p.last !== null && p.last === p.startValue) onToggle(p.last);
  };
  // The browser took the pointer away: the press is discarded, never a tap.
  const onPointerCancel = () => {
    press.current = null;
  };
  const onKeyboardClick = (e: MouseEvent<HTMLButtonElement>, level: LevelId) => {
    if (e.detail !== 0) return;
    if (level === value) onToggle(level);
    else onSlide(level);
  };
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
    buttonRefs.current.get(stops[next].id)?.focus();
    onSlide(stops[next].id);
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
        className="relative flex w-11 cursor-grab select-none flex-col gap-1 overflow-hidden rounded-full active:cursor-grabbing bg-dc-lavender p-1 shadow-[inset_0px_1px_1px_rgba(34,17,68,0.15),inset_0px_2px_4px_rgba(34,17,68,0.06)] lg:bg-dc-panel"
      >
        <div
          aria-hidden
          style={{ transform: `translateY(${(activeIndex < 0 ? stops.length : activeIndex) * (STOP_PX + STOP_GAP_PX)}px)`, height: STOP_PX, opacity: activeIndex < 0 ? 0 : 1, borderRadius: indicatorRadius(activeIndex, stops.length) }}
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
            className={cn("relative z-10 flex h-10 w-full cursor-[inherit] items-center justify-center rounded-full text-[16px] leading-none transition-colors", value === level.id ? "font-bold text-dc-purple" : "font-medium text-dc-muted")}
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
          "relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-dc-hairline text-[16px] leading-none transition-colors duration-150 ease-out",
          value === null ? "bg-white/90 font-bold text-dc-purple shadow-[0_1px_3px_rgba(22,11,43,0.12)] backdrop-blur" : "bg-dc-lavender font-medium text-dc-muted hover:text-dc-purple lg:bg-dc-panel"
        )}
      >
        All
      </button>
    </div>
  );
}
