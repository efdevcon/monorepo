"use client";

import { useLayoutEffect, useRef, useState } from "react";
import cn from "classnames";
import type { LucideIcon } from "lucide-react";

/**
 * Segmented control on its recessed track (Figma "Tabs"): the white pill
 * slides between segments; measured after render so it lands on the active
 * label's post-font-weight-swap width. Grown in the schedule (List/Timeline,
 * the timeline zoom) and shared since the analytics page needed the same
 * switch for its window.
 */
export function Segmented<T extends string | number>({
  value,
  onChange,
  items,
  iconOnly = false,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  items: readonly { value: T; label: string; Icon?: LucideIcon }[];
  /** Icons only, same 40px height: the floating copy next to Live now. */
  iconOnly?: boolean;
  /** Accessible name of the group. */
  label: string;
}) {
  const buttonRefs = useRef(new Map<T, HTMLButtonElement | null>());
  const [indicator, setIndicator] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = buttonRefs.current.get(value);
    if (!el) return;
    setIndicator({
      x: el.offsetLeft,
      y: el.offsetTop,
      w: el.offsetWidth,
      h: el.offsetHeight,
    });
  }, [value]);
  // The pill's first position is not a move: without this, every mount
  // slid it from the first segment to the active one — the Sessions /
  // Community Hubs switch remounts the schedule, and both switches
  // wiggled on each programme change (tester report, 2026-10-13). Placed
  // with the transition off and the styles flushed, so the hidden →
  // placed step is the browser's "before" state, then the transition is
  // handed back for later moves. A layout effect with a forced flush, not
  // a passive effect: after a click React flushes passive effects before
  // the browser's next style pass, so an override set and removed between
  // two style passes never took effect and the slide ran anyway (the
  // first attempt did that; it showed as the wiggle coming back).
  const pillRef = useRef<HTMLDivElement | null>(null);
  const placedRef = useRef(false);
  useLayoutEffect(() => {
    const el = pillRef.current;
    if (!indicator || !el || placedRef.current) return;
    placedRef.current = true;
    el.style.setProperty("transition", "none");
    void el.offsetWidth;
    el.style.removeProperty("transition");
  }, [indicator]);

  return (
    <div
      role="group"
      aria-label={label}
      className="relative flex h-10 shrink-0 items-center gap-1 rounded-lg bg-dc-lavender p-1 shadow-[inset_0px_1px_1px_rgba(34,17,68,0.15),inset_0px_2px_4px_rgba(34,17,68,0.06)] lg:bg-dc-panel"
    >
      <div
        aria-hidden
        style={
          indicator
            ? {
                transform: `translate(${indicator.x}px, ${indicator.y}px)`,
                width: indicator.w,
                height: indicator.h,
              }
            : { visibility: "hidden" }
        }
        ref={pillRef}
        className="absolute left-0 top-0 rounded-[4px] bg-white shadow-[0px_1px_3px_rgba(22,11,43,0.1),0px_1px_2px_rgba(22,11,43,0.1)] transition-[transform,width] duration-150 ease-out motion-reduce:transition-none"
      />
      {items.map(({ value: v, label: text, Icon }) => (
        <button
          key={v}
          ref={(el) => {
            buttonRefs.current.set(v, el);
          }}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={cn(
            "relative z-10 flex min-h-8 cursor-pointer items-center gap-2 rounded-[4px] py-1 text-[14px] leading-none transition-colors",
            // Text-only segments ("1×") get wider sides for a finger-sized cell.
            iconOnly ? "px-2.5" : Icon ? "px-2" : "px-3",
            value === v
              ? "font-bold text-dc-purple"
              : "font-medium text-dc-muted hover:text-dc-fg2"
          )}
        >
          {Icon && <Icon className="size-5" />}
          <span className={cn(iconOnly && Icon && "sr-only")}>{text}</span>
        </button>
      ))}
    </div>
  );
}

